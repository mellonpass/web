import type { CipherCardData, CipherData } from "../types";

export class ProtectedData {
  data: Uint8Array<ArrayBuffer>;
  mac: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;

  constructor(databuffer: Uint8Array<ArrayBuffer>) {
    const IV_START_LEN = databuffer.length - 16;
    const MAC_START_LEN = IV_START_LEN - 32;

    this.iv = databuffer.slice(IV_START_LEN, databuffer.byteLength);
    this.mac = databuffer.slice(MAC_START_LEN, IV_START_LEN);
    this.data = databuffer.slice(0, MAC_START_LEN);
  }
}

interface VaultDetailField {
  value: any | null;
  label: string;
  type: string;
  metadata?: { [key: string]: any };
}

interface VaultDetailFields {
  [key: string]: VaultDetailField;
}

abstract class VaultDetailComponentData<T extends CipherData> {
  protected data: T;

  fields: VaultDetailFields | null = null;

  constructor(data: T) {
    this.data = data;
  }

  protected abstract fieldDefinitions(): VaultDetailFields;

  private evaluateValueByType(value: any, type: string) {
    switch (type) {
      case "password":
        return "*****";
      default:
        return value;
    }
  }

  getFields(): Array<VaultDetailField> {
    this.fields = this.fieldDefinitions();

    const fieldNames = Object.keys(this.fields) as Array<
      keyof VaultDetailFields
    >;

    const fields_: Array<VaultDetailField> = [];
    fieldNames.forEach((key) => {
      if (this.fields) {
        const field = this.fields[key];
        field.value = this.evaluateValueByType(field.value, field.type);
        fields_.push(field);
      }
    });

    return fields_;
  }
}

export class VaultCardDetailComponentData extends VaultDetailComponentData<CipherCardData> {
  constructor(data: CipherCardData) {
    super(data);
  }

  protected fieldDefinitions() {
    const fields: VaultDetailFields = {
      name: {
        value: this.data.name,
        label: "Cardholder name",
        type: "text",
      },
      number: {
        value: this.data.number,
        label: "Number",
        type: "password",
      },
      brand: {
        value: this.data.brand,
        label: "Brand",
        type: "text",
        metadata: { hidden: true },
      },
    };

    if (this.data.expMonth || this.data.expYear) {
      // Nothing to worry reaching year 3000.
      const currentMillennia = 2000;
      const month = this.data.expMonth || "__";
      let year = this.data.expYear || "____";

      if (year.length > 4) {
        const currentYear = new Date().getFullYear();
        const currentYearWithinMillenia = currentYear - currentMillennia;

        // Get the last x digit of the provided year
        // where x is the char length of currentYearWithinMillenia.
        const calculatedYearWithinMillenia = year
          .toString()
          .slice(-String(currentYearWithinMillenia).length);

        year = (
          currentMillennia + parseInt(calculatedYearWithinMillenia)
        ).toString();
      } else if (year.length < 4) {
        year = (currentMillennia + parseInt(year)).toString();
      }

      fields.expiration = {
        value: `${month}/${year}`,
        label: "Expiration",
        type: "datetime",
      };
    }

    fields.securityCode = {
      value: this.data.securityCode,
      label: "Security Code",
      type: "password",
    };

    return fields;
  }
}

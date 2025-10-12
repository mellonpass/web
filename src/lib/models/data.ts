import type { CipherCardData, CipherData, CipherLoginData } from "$lib/types";

const CLIPBOARD_CLEAR_DELAY = 1000 * 30; // 30 seconds

export interface VaultDetailField {
  value: any | null;
  label: string;
  type: string;
  hidden: boolean;
  copy: boolean;
  displayValue?: () => string;
  copyEvent?: () => void;
  metadata?: { [key: string]: any };
}

interface VaultDetailFields {
  [key: string]: VaultDetailField;
}

abstract class VaultDetailComponentData<T extends CipherData> {
  public data: T;

  fields: VaultDetailFields;

  constructor(data: T) {
    this.data = data;
    this.fields = this.fieldDefinitions();
  }

  protected abstract fieldDefinitions(): VaultDetailFields;

  private setCopyEvent(field: VaultDetailField) {
    field.copyEvent = () => {
      navigator.clipboard.writeText(field.value);

      setTimeout(() => {
        navigator.clipboard.writeText("");
      }, CLIPBOARD_CLEAR_DELAY);
    };
  }

  private setDisplayvalue(field: VaultDetailField) {
    field.displayValue = () => {
      switch (field.type) {
        case "password":
          return "*****";
        default:
          return field.value;
      }
    };
  }

  getFields(): Array<VaultDetailField> {
    const fieldNames = Object.keys(this.fields) as Array<
      keyof VaultDetailFields
    >;

    const fields_: Array<VaultDetailField> = [];
    fieldNames.forEach((key) => {
      if (this.fields) {
        const field = this.fields[key];

        if (field.value) {
          if (field.copy) {
            this.setCopyEvent(field);
          }

          this.setDisplayvalue(field);

          fields_.push(field);
        }
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
        copy: false,
        hidden: false,
      },
      number: {
        value: this.data.number,
        label: "Number",
        type: "password",
        copy: true,
        hidden: false,
      },
      brand: {
        value: this.data.brand,
        label: "Brand",
        type: "text",
        copy: false,
        hidden: true,
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
        copy: false,
        hidden: false,
      };
    }

    fields.securityCode = {
      value: this.data.securityCode,
      label: "Security Code",
      type: "password",
      copy: true,
      hidden: false,
    };

    return fields;
  }
}

export class VaultLoginDetailComponentData extends VaultDetailComponentData<CipherLoginData> {
  constructor(data: CipherLoginData) {
    super(data);
  }

  protected fieldDefinitions() {
    const fields: VaultDetailFields = {
      username: {
        value: this.data.username,
        label: "Username",
        type: "text",
        copy: true,
        hidden: false,
      },
      password: {
        value: this.data.password,
        label: "Password",
        type: "password",
        copy: true,
        hidden: false,
      },
    };
    return fields;
  }
}

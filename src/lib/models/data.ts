import type { CipherCardData, CipherData, CipherLoginData } from "$lib/types";
import UIkit from "uikit";

const CLIPBOARD_CLEAR_DELAY = 1000 * 30; // 30 seconds

export abstract class VaultDetailField {
  value: any | null;
  label: string;
  type: "text" | "password" | "datetime";
  hidden: boolean;

  constructor(
    value: any | null,
    label: string,
    type: "text" | "password" | "datetime",
    hidden: boolean = false
  ) {
    this.value = value;
    this.label = label;
    this.type = type;
    this.hidden = hidden;
  }

  public displayValue() {
    return this.value;
  }

  public copyEvent() {
    navigator.clipboard.writeText(this.value);
    setTimeout(() => {
      navigator.clipboard.writeText("");
    }, CLIPBOARD_CLEAR_DELAY);

    UIkit.notification({
      message: `<div class='uk-alert-success uk-text-default uk-padding-small'>${this.label} copied!<div>`,
      pos: "top-right",
      timeout: 5000,
    });
  }
}

class VaultDetailTextField extends VaultDetailField {
  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "text", hidden);
  }
}

export class VaultDetailPasswordField extends VaultDetailField {
  public tooglePassword: boolean = false;

  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "password", hidden);
  }

  displayValue() {
    return this.tooglePassword ? this.value : "••••••••";
  }
}

abstract class VaultDetailComponentData<T extends CipherData> {
  public data: T;

  fields: Array<VaultDetailField>;

  constructor(data: T) {
    this.data = data;
    this.fields = this.fieldDefinitions();
  }

  protected abstract fieldDefinitions(): Array<VaultDetailField>;
}

export class VaultCardDetailComponentData extends VaultDetailComponentData<CipherCardData> {
  constructor(data: CipherCardData) {
    super(data);
  }

  protected fieldDefinitions() {
    const fields: Array<VaultDetailField> = [
      new VaultDetailTextField(this.data.cardholderName, "Cardholder Name"),
      new VaultDetailPasswordField(this.data.number, "Card Number"),
      new VaultDetailTextField(this.data.brand, "Brand", true),
    ];

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

      // Index order is important for display.
      fields.push(
        ...[
          new VaultDetailTextField(`${month}/${year}`, "Expiration"),
          new VaultDetailPasswordField(this.data.securityCode, "Security Code"),
        ]
      );
    }

    return fields;
  }
}

export class VaultLoginDetailComponentData extends VaultDetailComponentData<CipherLoginData> {
  constructor(data: CipherLoginData) {
    super(data);
  }

  protected fieldDefinitions() {
    return [
      new VaultDetailTextField(this.data.username, "Username"),
      new VaultDetailPasswordField(this.data.password, "Password"),
    ];
  }
}

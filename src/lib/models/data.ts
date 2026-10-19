import { authenticator } from "otplib";
import { toast } from "$lib/toast.svelte";
import type {
  CipherCardData,
  CipherData,
  CipherDatabaseData,
  CipherLoginData,
} from "$lib/types";

export abstract class VaultDetailField {
  value: any | null;
  label: string;
  type: "text" | "password" | "datetime" | "otp" | "url";
  hidden: boolean;

  constructor(
    value: any | null,
    label: string,
    type: "text" | "password" | "datetime" | "otp" | "url",
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
    const isSensitive = this.type === "password" || this.type === "otp";
    toast.copySecret(String(this.value ?? ""), this.label, isSensitive);
  }
}

export class VaultDetailTextField extends VaultDetailField {
  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "text", hidden);
  }
}

export class VaultDetailUrlField extends VaultDetailField {
  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "url", hidden);
  }

  get href(): string {
    if (!this.value) return "#";
    const str = String(this.value).trim();
    if (/^https?:\/\//i.test(str)) return str;
    return `https://${str}`;
  }
}

export class VaultDetailPasswordField extends VaultDetailField {
  toggleState: boolean = false;

  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "password", hidden);
  }

  displayValue() {
    return this.toggleState ? this.value : "••••••••••••";
  }

  togglePassword(): boolean {
    this.toggleState = !this.toggleState;
    return this.toggleState;
  }
}

export class VaultDetailTOTPField extends VaultDetailField {
  constructor(value: any | null, label: string, hidden: boolean = false) {
    super(value, label, "otp", hidden);
  }

  displayValue() {
    try {
      const cleanSecret = String(this.value || "").replace(/\s+/g, "").toUpperCase();
      return authenticator.generate(cleanSecret);
    } catch {
      return "Invalid key";
    }
  }

  getRemainingSeconds(): number {
    return authenticator.timeRemaining();
  }

  public copyEvent() {
    const code = this.displayValue();
    if (code && code !== "Invalid key") {
      toast.copySecret(code, this.label, true);
    }
  }
}

abstract class VaultDetailComponentData<T extends CipherData> {
  public data: T;

  fields: Array<VaultDetailField>;

  constructor(data: T) {
    this.data = data;

    // filter out empty fields.
    this.fields = this.fieldDefinitions().filter(
      (field) => field.value !== null && field.value !== undefined && field.value !== ""
    );
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
      const currentMillennia = 2000;
      const month = this.data.expMonth || "__";
      let year = String(this.data.expYear || "____");

      if (year !== "____") {
        if (year.length > 4) {
          const currentYear = new Date().getFullYear();
          const currentYearWithinMillenia = currentYear - currentMillennia;
          const calculatedYearWithinMillenia = year
            .toString()
            .slice(-String(currentYearWithinMillenia).length);

          year = (
            currentMillennia + parseInt(calculatedYearWithinMillenia)
          ).toString();
        } else if (year.length < 4 && !isNaN(parseInt(year))) {
          year = (currentMillennia + parseInt(year)).toString();
        }
      }

      fields.push(
        new VaultDetailTextField(`${month}/${year}`, "Expiration")
      );
    }

    if (this.data.securityCode) {
      fields.push(
        new VaultDetailPasswordField(this.data.securityCode, "Security Code (CVV)")
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
      new VaultDetailTOTPField(
        this.data.authenticatorKey,
        "Verification code (TOTP)"
      ),
      new VaultDetailUrlField(this.data.url, "Website"),
    ];
  }
}

export class VaultDatabaseDetailComponentData extends VaultDetailComponentData<CipherDatabaseData> {
  constructor(data: CipherDatabaseData) {
    super(data);
  }

  protected fieldDefinitions() {
    const fields: Array<VaultDetailField> = [
      new VaultDetailTextField(this.data.engine, "Engine"),
    ];

    if (this.data.connectionType === "URL") {
      fields.push(
        new VaultDetailPasswordField(this.data.url, "Connection URL")
      );
    } else {
      if (this.data.host)
        fields.push(new VaultDetailTextField(this.data.host, "Host"));
      if (this.data.port)
        fields.push(new VaultDetailTextField(this.data.port, "Port"));
      if (this.data.database)
        fields.push(new VaultDetailTextField(this.data.database, "Database"));
      if (this.data.username)
        fields.push(new VaultDetailTextField(this.data.username, "Username"));
      if (this.data.password)
        fields.push(
          new VaultDetailPasswordField(this.data.password, "Password")
        );
    }

    return fields;
  }
}

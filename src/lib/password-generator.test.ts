import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GENERATOR_OPTIONS,
  evaluatePasswordStrength,
  generateSecret,
  tokenizeSecretForDisplay,
  type PasswordGeneratorOptions,
} from "$lib/password-generator";

const AMBIGUOUS = new Set(["0", "O", "o", "1", "l", "I", "|"]);

describe("generateSecret — password mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("clamps password length to [6, 128] and respects exact valid lengths", () => {
    expect(
      generateSecret({ ...DEFAULT_GENERATOR_OPTIONS, length: 2 }).length
    ).toBe(6);
    expect(
      generateSecret({ ...DEFAULT_GENERATOR_OPTIONS, length: 256 }).length
    ).toBe(128);
    expect(
      generateSecret({ ...DEFAULT_GENERATOR_OPTIONS, length: 24 }).length
    ).toBe(24);
  });

  it("guarantees at least one character from every enabled class", () => {
    for (let i = 0; i < 50; i++) {
      const secret = generateSecret({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: 12,
        uppercase: true,
        lowercase: true,
        digits: true,
        symbols: true,
        avoidAmbiguous: false,
      });

      expect(secret).toHaveLength(12);
      expect(/[a-z]/.test(secret)).toBe(true);
      expect(/[A-Z]/.test(secret)).toBe(true);
      expect(/\d/.test(secret)).toBe(true);
      expect(/[^a-zA-Z0-9]/.test(secret)).toBe(true);
    }
  });

  it("supports single-class pools and falls back to lowercase+digits if all classes disabled", () => {
    const digitsOnly = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      length: 16,
      uppercase: false,
      lowercase: false,
      digits: true,
      symbols: false,
      avoidAmbiguous: false,
    });
    expect(digitsOnly).toMatch(/^\d{16}$/);

    const fallback = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      length: 20,
      uppercase: false,
      lowercase: false,
      digits: false,
      symbols: false,
      avoidAmbiguous: true,
    });
    expect(fallback).toMatch(/^[a-z0-9]{20}$/);
    for (const ch of fallback) {
      expect(AMBIGUOUS.has(ch)).toBe(false);
    }
  });

  it("excludes ambiguous characters when avoidAmbiguous is true", () => {
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret({
        ...DEFAULT_GENERATOR_OPTIONS,
        length: 32,
        avoidAmbiguous: true,
      });
      for (const ch of secret) {
        expect(AMBIGUOUS.has(ch)).toBe(false);
      }
    }
  });

  it("performs CSPRNG rejection sampling to eliminate modulo bias", () => {
    let calls = 0;
    const spy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        const view = array as unknown as Uint32Array;
        calls += 1;
        // First draw returns 0xffffffff (>= limit for max = 344, since 2^32 % 344 !== 0),
        // which must be rejected and re-sampled before accepting a valid value.
        view[0] = calls === 1 ? 0xffffffff : calls;
        return array;
      });

    const passphrase = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      mode: "passphrase",
      wordCount: 3,
      includeNumberInPassphrase: false,
      capitalizeWords: false,
      separator: "-",
    });

    expect(spy).toHaveBeenCalled();
    // 3 words + 1 rejected sample = 4 calls minimum
    expect(calls).toBe(4);
    expect(passphrase.split("-")).toHaveLength(3);
  });
});

describe("generateSecret — passphrase mode", () => {
  it("clamps wordCount to [3, 10] and joins words using separator", () => {
    const minPassphrase = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      mode: "passphrase",
      wordCount: 1,
      separator: "_",
      includeNumberInPassphrase: false,
    });
    expect(minPassphrase.split("_")).toHaveLength(3);

    const maxPassphrase = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      mode: "passphrase",
      wordCount: 20,
      separator: ".",
      includeNumberInPassphrase: false,
    });
    expect(maxPassphrase.split(".")).toHaveLength(10);
  });

  it("respects capitalizeWords and includeNumberInPassphrase options", () => {
    const capitalized = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      mode: "passphrase",
      wordCount: 5,
      separator: "-",
      capitalizeWords: true,
      includeNumberInPassphrase: false,
    });
    const capWords = capitalized.split("-");
    expect(capWords).toHaveLength(5);
    for (const word of capWords) {
      expect(word).toMatch(/^[A-Z][a-z]+$/);
    }

    const withNumber = generateSecret({
      ...DEFAULT_GENERATOR_OPTIONS,
      mode: "passphrase",
      wordCount: 4,
      separator: "-",
      capitalizeWords: false,
      includeNumberInPassphrase: true,
    });
    const numWords = withNumber.split("-");
    expect(numWords).toHaveLength(4);
    const numbered = numWords.filter((w) => /\d{2}$/.test(w));
    expect(numbered).toHaveLength(1);
    const suffixNum = Number(numbered[0].match(/(\d{2})$/)![1]);
    expect(suffixNum).toBeGreaterThanOrEqual(10);
    expect(suffixNum).toBeLessThanOrEqual(99);

    // When capitalizeWords is false, all words must be lowercase (including e.g. 'toucan')
    for (let i = 0; i < 30; i++) {
      const lower = generateSecret({
        ...DEFAULT_GENERATOR_OPTIONS,
        mode: "passphrase",
        wordCount: 10,
        separator: "-",
        capitalizeWords: false,
        includeNumberInPassphrase: false,
      });
      expect(lower).toBe(lower.toLowerCase());
    }
  });
});

describe("evaluatePasswordStrength and tokenizeSecretForDisplay", () => {
  it("scores empty, weak, fair, strong, and excellent passwords accurately", () => {
    const empty = evaluatePasswordStrength("");
    expect(empty.score).toBe(0);
    expect(empty.entropyBits).toBe(0);
    expect(empty.label).toBe("Very Weak");

    expect(evaluatePasswordStrength(null).score).toBe(0);
    expect(evaluatePasswordStrength(undefined).score).toBe(0);

    const weak = evaluatePasswordStrength("abc123");
    expect(weak.score).toBe(1);
    expect(weak.label).toBe("Weak");

    const fair = evaluatePasswordStrength("Abcdef1234");
    expect(fair.score).toBe(2);
    expect(fair.label).toBe("Fair");

    const strong = evaluatePasswordStrength("Str0ng!Pass12");
    expect(strong.score).toBe(3);
    expect(strong.label).toBe("Strong");

    const excellent = evaluatePasswordStrength("Exce11ent$Vault#Key2026!XyZ");
    expect(excellent.score).toBe(4);
    expect(excellent.label).toBe("Excellent");
  });

  it("penalizes repeated characters in entropy calculation", () => {
    const repeated = evaluatePasswordStrength("aaaaaaaaaaaa");
    const diverse = evaluatePasswordStrength("abcdefghijkl");
    expect(repeated.entropyBits).toBeLessThan(diverse.entropyBits);
  });

  it("tokenizes characters into letter, digit, and symbol categories", () => {
    expect(tokenizeSecretForDisplay("aB9!_")).toEqual([
      { char: "a", type: "letter" },
      { char: "B", type: "letter" },
      { char: "9", type: "digit" },
      { char: "!", type: "symbol" },
      { char: "_", type: "symbol" },
    ]);
  });
});

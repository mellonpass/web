export interface PasswordGeneratorOptions {
  mode: "password" | "passphrase";
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  wordCount: number;
  separator: string;
  capitalizeWords: boolean;
  includeNumberInPassphrase: boolean;
}

export const DEFAULT_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  mode: "password",
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
  wordCount: 4,
  separator: "-",
  capitalizeWords: false,
  includeNumberInPassphrase: true,
};

const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGIT_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()-_=+[]{}|;:,.<>?";
const AMBIGUOUS_CHARS = new Set(["0", "O", "o", "1", "l", "I", "|"]);

const WORDLIST = [
  "acorn", "agate", "alchemy", "alpine", "amber", "anchor", "anise", "apex",
  "apricot", "arcade", "argon", "armada", "arrow", "aspen", "aster", "atlas",
  "aurora", "avalon", "avocado", "azimuth", "badger", "balsam", "bamboo", "banjo",
  "banyan", "barley", "basalt", "beacon", "bison", "bistro", "blizzard", "blossom",
  "bonfire", "bonsai", "boulder", "breeze", "briar", "bronze", "brook", "buckle",
  "cabana", "cactus", "cadence", "calico", "camelot", "canopy", "canyon", "caravan",
  "carbon", "cascade", "cashew", "castle", "catalyst", "cedar", "celeste", "chalet",
  "chariot", "chimera", "chronicle", "cinder", "citadel", "citrine", "citrus", "clarity",
  "cobalt", "comet", "compass", "condor", "copper", "coral", "cosmos", "cougar",
  "crater", "crimson", "crystal", "cypress", "dagger", "dahlia", "delta", "destiny",
  "diamond", "dolphin", "domino", "dragon", "drift", "dynamo", "eclipse", "echo",
  "edelweiss", "ember", "emerald", "enigma", "equinox", "estuary", "evergreen", "falcon",
  "fathom", "fennel", "fjord", "flannel", "flint", "flora", "fortress", "fossil",
  "fountain", "fresco", "fusion", "galaxy", "galleon", "garnet", "gazelle", "geyser",
  "glacier", "glimmer", "granite", "griffin", "grove", "harbor", "harmony", "harvest",
  "hazel", "heather", "helium", "hemlock", "herald", "hibiscus", "horizon", "hummingbird",
  "indigo", "infinity", "iridium", "island", "ivory", "jasmine", "jasper", "javelin",
  "juniper", "kaleidoscope", "kestrel", "keystone", "kimono", "kinetic", "kingdom", "krypton",
  "labyrinth", "lagoon", "lantern", "larch", "laurel", "lavender", "legacy", "legend",
  "leopard", "liberty", "lichen", "lightning", "lotus", "lumen", "lynx", "magnolia",
  "mahogany", "malachite", "mammoth", "mandarin", "mangrove", "mantis", "maple", "marble",
  "marigold", "mariner", "matrix", "meadow", "mercury", "meridian", "meteor", "mirage",
  "monarch", "monolith", "monsoon", "mosaic", "mulberry", "mustang", "myrtle", "nebula",
  "nectar", "neptune", "nexus", "nimbus", "nitrogen", "nomad", "nova", "nutmeg",
  "oasis", "obsidian", "ocelot", "odyssey", "olive", "omega", "onyx", "opal",
  "orbit", "orchid", "origami", "orion", "osprey", "otter", "oxygen", "pagoda",
  "paladin", "panther", "papyrus", "paragon", "paradox", "parasol", "pegasus", "pelican",
  "pendulum", "peony", "peregrine", "peridot", "phantom", "phoenix", "pinnacle", "pioneer",
  "pistachio", "planet", "platinum", "plover", "polaris", "pomegranate", "poplar", "porcelain",
  "iguana", "prism", "pulsar", "pyramid", "python", "quantum", "quartz", "quasar",
  "quicksilver", "quiver", "radon", "rainforest", "raptor", "raven", "redwood", "reef",
  "relic", "resonance", "rhodium", "riptide", "river", "rosemary", "ruby", "saffron",
  "sahara", "salamander", "sapphire", "savanna", "scarlet", "scepter", "sequoia", "seraph",
  "serenity", "shadow", "shamrock", "sierra", "silicon", "silver", "sirocco", "skylark",
  "solstice", "sonata", "sparrow", "spectrum", "sphinx", "spruce", "starlight", "sterling",
  "stratus", "summit", "sundial", "supernova", "sycamore", "symphony", "talisman", "tamarind",
  "tangerine", "tapestry", "tempest", "terracotta", "thistle", "thunder", "titanium", "topaz",
  "tornado", "torrent", "Toucan", "trident", "trillium", "trinity", "triumph", "tundra",
  "tungsten", "turquoise", "twilight", "typhoon", "umbra", "unicorn", "utopia", "valkyrie",
  "valley", "vanadium", "vanguard", "velvet", "venture", "verbena", "vermilion", "vertex",
  "vesper", "vortex", "voyager", "vulcan", "walnut", "waterfall", "whisper", "wildfire",
  "willow", "windsor", "wisteria", "wolverine", "zenith", "zephyr", "zircon", "zodiac"
];

function secureRandomIndex(max: number): number {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  let value: number;
  do {
    crypto.getRandomValues(array);
    value = array[0];
  } while (value >= limit);
  return value % max;
}

export function generateSecret(options: PasswordGeneratorOptions = DEFAULT_GENERATOR_OPTIONS): string {
  if (options.mode === "passphrase") {
    const count = Math.max(3, Math.min(10, options.wordCount));
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      let word = WORDLIST[secureRandomIndex(WORDLIST.length)].toLowerCase();
      if (options.capitalizeWords) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
      words.push(word);
    }
    if (options.includeNumberInPassphrase && words.length > 0) {
      const targetIdx = secureRandomIndex(words.length);
      const num = secureRandomIndex(90) + 10;
      words[targetIdx] = `${words[targetIdx]}${num}`;
    }
    return words.join(options.separator ?? "-");
  }

  let pool = "";
  const requiredChars: string[] = [];

  const filterAmbiguous = (chars: string) =>
    options.avoidAmbiguous
      ? chars
          .split("")
          .filter((c) => !AMBIGUOUS_CHARS.has(c))
          .join("")
      : chars;

  if (options.lowercase) {
    const chars = filterAmbiguous(LOWERCASE_CHARS);
    pool += chars;
    if (chars.length > 0) requiredChars.push(chars[secureRandomIndex(chars.length)]);
  }
  if (options.uppercase) {
    const chars = filterAmbiguous(UPPERCASE_CHARS);
    pool += chars;
    if (chars.length > 0) requiredChars.push(chars[secureRandomIndex(chars.length)]);
  }
  if (options.digits) {
    const chars = filterAmbiguous(DIGIT_CHARS);
    pool += chars;
    if (chars.length > 0) requiredChars.push(chars[secureRandomIndex(chars.length)]);
  }
  if (options.symbols) {
    const chars = filterAmbiguous(SYMBOL_CHARS);
    pool += chars;
    if (chars.length > 0) requiredChars.push(chars[secureRandomIndex(chars.length)]);
  }

  if (!pool) {
    pool = filterAmbiguous(LOWERCASE_CHARS + DIGIT_CHARS);
  }

  const targetLength = Math.max(6, Math.min(128, options.length));
  const result: string[] = [...requiredChars];

  while (result.length < targetLength) {
    result.push(pool[secureRandomIndex(pool.length)]);
  }

  // Fisher-Yates shuffle with CSPRNG
  for (let i = result.length - 1; i > 0; i--) {
    const j = secureRandomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.slice(0, targetLength).join("");
}

export interface PasswordStrengthReport {
  entropyBits: number;
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Excellent";
  colorClass: string;
}

export function evaluatePasswordStrength(password: string | null | undefined): PasswordStrengthReport {
  if (!password || password.length === 0) {
    return {
      entropyBits: 0,
      score: 0,
      label: "Very Weak",
      colorClass: "text-rose-500 bg-rose-500",
    };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const uniqueRatio = new Set(password.split("")).size / password.length;
  const effectiveLength = password.length * (0.65 + 0.35 * uniqueRatio);
  const entropyBits = Math.round(effectiveLength * Math.log2(Math.max(poolSize, 2)));

  if (password.length < 8 || entropyBits < 40) {
    return { entropyBits, score: 1, label: "Weak", colorClass: "text-rose-500 bg-rose-500" };
  }
  if (password.length < 12 || entropyBits < 60) {
    return { entropyBits, score: 2, label: "Fair", colorClass: "text-amber-500 bg-amber-500" };
  }
  if (entropyBits < 85) {
    return { entropyBits, score: 3, label: "Strong", colorClass: "text-emerald-500 bg-emerald-500" };
  }
  return { entropyBits, score: 4, label: "Excellent", colorClass: "text-indigo-500 bg-indigo-500" };
}

export interface ColoredCharToken {
  char: string;
  type: "letter" | "digit" | "symbol";
}

export function tokenizeSecretForDisplay(secret: string): ColoredCharToken[] {
  return secret.split("").map((char) => {
    if (/\d/.test(char)) return { char, type: "digit" };
    if (/[a-zA-Z]/.test(char)) return { char, type: "letter" };
    return { char, type: "symbol" };
  });
}

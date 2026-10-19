export type ThemeMode = "light" | "dark";

class ThemeStore {
  mode: ThemeMode = $state("light");

  constructor() {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mp_theme") as ThemeMode | null;
      this.mode = saved === "dark" ? "dark" : "light";
      this.apply();
    }
  }

  toggle() {
    this.set(this.mode === "light" ? "dark" : "light");
  }

  set(mode: ThemeMode) {
    this.mode = mode;
    if (typeof window !== "undefined") {
      localStorage.setItem("mp_theme", mode);
      this.apply();
    }
  }

  private apply() {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", this.mode === "dark");
    }
  }
}

export const theme = new ThemeStore();

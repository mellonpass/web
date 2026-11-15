import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const nodeEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env;
if (nodeEnv) {
  nodeEnv.PUBLIC_SERVER_URL ??= "http://localhost:8000";
}

export default defineConfig({
  plugins: [tailwindcss(), nodePolyfills(), sveltekit()],
  optimizeDeps: {
    include: ["buffer"],
  },
  test: {
    include: ["src/**/*.{test,spec}.{js,ts}"],
    environment: "node",
  },
});

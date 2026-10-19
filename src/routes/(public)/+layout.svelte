<script lang="ts">
    import Icon from "@iconify/svelte";
    import { theme } from "$lib/theme.svelte";

    let { children } = $props();
</script>

<section class="relative flex h-dvh w-full flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
    <!-- Subtle ambient gradient background -->
    <div
        class="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
    >
        <div
            class="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/8 dark:bg-indigo-500/12 blur-3xl"
        ></div>
    </div>

    <!-- Header -->
    <header class="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <a
            href="/"
            aria-label="Back to Home"
            class="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold tracking-tight text-lg"
        >
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
                <Icon icon="hugeicons:shield-key" width="20" height="20" />
            </div>
            <span>MellonPass</span>
        </a>

        <button
            type="button"
            onclick={() => theme.toggle()}
            aria-label="Toggle color theme"
            class="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
            <Icon
                icon={theme.mode === "dark" ? "hugeicons:sun-03" : "hugeicons:moon-02"}
                width="16"
                height="16"
            />
            <span>{theme.mode === "dark" ? "Daylight" : "Obsidian"}</span>
        </button>
    </header>

    <!-- Main Centered Card -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div class="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
            {@render children()}
        </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        End-to-End Encrypted • Zero-Knowledge Architecture
    </footer>
</section>

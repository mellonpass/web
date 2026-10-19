<script lang="ts">
    import { page } from "$app/state";
    import Icon from "@iconify/svelte";
</script>

{#if page.error}
    <div class="flex h-dvh w-full items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Icon icon="hugeicons:alert-02" width="28" height="28" />
            </div>
            <p class="mt-4 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Error {page.status}
            </p>
            <h1 class="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {page.error.message}
            </h1>
            <div class="mt-6">
                <a
                    href="/"
                    class="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                >
                    <Icon icon="hugeicons:home-01" width="18" height="18" />
                    Return to Vault
                </a>
            </div>
        </div>
    </div>
{/if}

<script lang="ts">
    import Icon from "@iconify/svelte";

    let { message } = $props();
</script>

<div class="text-center">
    <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Icon icon="hugeicons:alert-02" width="26" height="26" />
    </div>
    <h2 class="mt-4 text-xl font-bold text-slate-900 dark:text-white">
        {message || "Invalid or Expired Verification Link"}
    </h2>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Please restart registration or try logging in if you have already completed your account setup.
    </p>

    <div class="mt-6 space-y-2.5">
        <a
            href="/sign-up"
            class="flex w-full items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-colors"
        >
            Restart registration
        </a>
        <a
            href="/login"
            class="flex w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors"
        >
            Back to Login
        </a>
    </div>
</div>
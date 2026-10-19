<script lang="ts">
    import Icon from "@iconify/svelte";
    import gravatar from "gravatar";
    import { deriveLoginKeysAsync } from "$lib/crypto-client";
    import { logoutAccount, unlock } from "$lib/services/accounts";
    import { invalidateAll } from "$app/navigation";
    import { theme } from "$lib/theme.svelte";

    let mPass = $state("");
    let toggleMpass = $state(false);
    let invalid = $state(false);
    let error = $state(false);
    let errorMsg = $state("");
    let submitting = $state(false);
    let cryptoStep = $state("");
    let cryptoPercent = $state(0);

    const whoamiRaw = localStorage.getItem("whoami");
    const whoami = whoamiRaw ? JSON.parse(whoamiRaw) : { identity: "" };
    const gravatarUrl = whoami.identity
        ? gravatar.url(whoami.identity, { s: "120", r: "pg", d: "retro" })
        : "";

    const handleLogout = async () => {
        await logoutAccount();
        invalidateAll();
    };

    const onSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        invalid = !mPass || mPass.length === 0;
        if (invalid) return;

        submitting = true;
        error = false;
        cryptoStep = "Deriving master key...";
        cryptoPercent = 25;

        try {
            const { mkBase64, loginHash } = await deriveLoginKeysAsync(
                whoami.identity,
                mPass,
                (step, percent) => {
                    cryptoStep = step;
                    cryptoPercent = percent;
                }
            );

            cryptoStep = "Unlocking encrypted vault...";
            cryptoPercent = 95;

            const response = await unlock(loginHash);
            localStorage.setItem("mk", mkBase64);
            localStorage.setItem("epsk", response.data.psk);
            window.location.assign("/");
        } catch (err: any) {
            error = true;
            errorMsg = err?.error || "Invalid master password.";
            submitting = false;
            cryptoStep = "";
            cryptoPercent = 0;
        }
    };
</script>

<section class="relative flex h-dvh w-full flex-col justify-between overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
    <!-- Ambient background glow -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div class="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-indigo-500/8 dark:bg-indigo-500/12 blur-3xl"></div>
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

    <!-- Centered Lock Card -->
    <main class="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div class="w-full max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-7 sm:p-8 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
            <header class="text-center">
                <div class="relative mx-auto mb-3 inline-flex">
                    {#if gravatarUrl}
                        <img
                            src={gravatarUrl}
                            alt={whoami.identity}
                            class="h-14 w-14 rounded-2xl border-2 border-indigo-500/20 object-cover shadow-sm"
                        />
                    {:else}
                        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Icon icon="hugeicons:square-lock-02" width="28" height="28" />
                        </div>
                    {/if}
                    <div class="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white ring-2 ring-white dark:ring-slate-900">
                        <Icon icon="hugeicons:square-lock-02" width="13" height="13" />
                    </div>
                </div>
                <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                    Your vault is locked
                </h1>
                <p class="mt-1 inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {whoami.identity}
                </p>
            </header>

            <form class="mt-6 space-y-4" onsubmit={onSubmit} novalidate>
                <div>
                    <label
                        for="master-password"
                        class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                        Master password
                    </label>
                    <div class="relative mt-1.5">
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                            id="master-password"
                            autofocus
                            bind:value={mPass}
                            oninput={() => {
                                invalid = false;
                                error = false;
                            }}
                            type={toggleMpass ? "text" : "password"}
                            placeholder="Enter master password to unlock"
                            autocomplete="off"
                            disabled={submitting}
                            required
                            class="w-full rounded-xl border bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {invalid || error
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                        />
                        <button
                            type="button"
                            aria-label="Toggle master password visibility"
                            onclick={() => (toggleMpass = !toggleMpass)}
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <Icon
                                icon="hugeicons:{toggleMpass ? 'view-off-slash' : 'view'}"
                                width="18"
                                height="18"
                            />
                        </button>
                    </div>

                    {#if invalid}
                        <p class="mt-1.5 text-xs text-rose-500">
                            Master password is required.
                        </p>
                    {/if}
                    {#if error}
                        <p class="mt-1.5 text-xs text-rose-500">
                            {errorMsg}
                        </p>
                    {/if}
                </div>

                {#if submitting && cryptoStep}
                    <div class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
                        <div class="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                            <Icon icon="hugeicons:loading-03" width="16" height="16" class="animate-spin shrink-0" />
                            <span>{cryptoStep}</span>
                        </div>
                        <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-indigo-500/15">
                            <div
                                class="h-full bg-indigo-600 transition-all duration-300"
                                style="width: {cryptoPercent}%;"
                            ></div>
                        </div>
                    </div>
                {/if}

                <button
                    type="submit"
                    disabled={submitting}
                    class="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                >
                    <Icon icon="hugeicons:square-unlock-02" width="18" height="18" />
                    <span>{submitting ? "Unlocking..." : "Unlock Vault"}</span>
                </button>
            </form>

            <div class="relative my-5">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-slate-100 dark:border-slate-800"></div>
                </div>
                <div class="relative flex justify-center text-xs">
                    <span class="bg-white dark:bg-slate-900 px-2.5 text-slate-400">or</span>
                </div>
            </div>

            <button
                type="button"
                onclick={handleLogout}
                class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            >
                <Icon icon="hugeicons:logout-01" width="16" height="16" />
                <span>Sign out of {whoami.identity}</span>
            </button>
        </div>
    </main>

    <footer class="relative z-10 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Session auto-locked to protect your encryption keys in memory
    </footer>
</section>

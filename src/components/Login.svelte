<script lang="ts">
    import {
        PUBLIC_CF_ENABLE_TURNSTILE,
        PUBLIC_CF_TURNSTILE_SITE_KEY,
    } from "$env/static/public";
    import Icon from "@iconify/svelte";
    import { page } from "$app/state";
    import Turnstile from "./Turnstile.svelte";
    import { deriveLoginKeysAsync } from "$lib/crypto-client";
    import { loginAccount } from "$lib/services/accounts";

    let email = $state("");
    let masterPassword = $state("");
    let showPassword = $state(false);
    let touchedEmail = $state(false);
    let touchedPassword = $state(false);

    const enableTurnstile = PUBLIC_CF_ENABLE_TURNSTILE == "true";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailInvalid = $derived(touchedEmail && !emailRegex.test(email.trim()));
    const passwordInvalid = $derived(touchedPassword && masterPassword.length === 0);

    const isFormValid = $derived(
        emailRegex.test(email.trim()) && masterPassword.length > 0
    );

    let loginError: string | null = $state(null);
    let cfTurnsTileToken: string | null = $state(null);
    let formSubmitted = $state(false);
    let cryptoStep = $state("");
    let cryptoPercent = $state(0);

    const onFormSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        touchedEmail = true;
        touchedPassword = true;

        if (!isFormValid) return;

        formSubmitted = true;
        loginError = null;
        cryptoStep = "Initializing zero-knowledge key derivation...";
        cryptoPercent = 15;

        try {
            const { mkBase64, loginHash } = await deriveLoginKeysAsync(
                email.trim(),
                masterPassword,
                (step, percent) => {
                    cryptoStep = step;
                    cryptoPercent = percent;
                }
            );

            cryptoStep = "Authenticating with MellonPass server...";
            cryptoPercent = 95;

            const response = await loginAccount(
                email.trim(),
                loginHash,
                cfTurnsTileToken!
            );
            localStorage.setItem("mk", mkBase64);
            localStorage.setItem("epsk", response.data.psk);
            window.location.assign(page.url.searchParams.get("next") ?? "/");
        } catch (error: any) {
            cfTurnsTileToken = null;
            loginError =
                typeof error?.error === "string"
                    ? error.error
                    : "Invalid credentials. Please check your email and master password.";
            formSubmitted = false;
            cryptoStep = "";
            cryptoPercent = 0;
        }
    };
</script>

<div>
    <header class="text-center">
        <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Icon icon="hugeicons:lock-key" width="24" height="24" />
        </div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">
            Sign in to your vault
        </h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Enter your email and master password to decrypt locally
        </p>
    </header>

    <form class="mt-6 space-y-4" onsubmit={onFormSubmit} novalidate>
        {#if loginError}
            <div
                role="alert"
                class="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300"
            >
                <Icon
                    icon="hugeicons:alert-02"
                    width="16"
                    height="16"
                    class="mt-0.5 shrink-0 text-rose-500"
                />
                <span>{loginError}</span>
            </div>
        {/if}

        <div>
            <label
                for="email"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Email address
            </label>
            <div class="relative mt-1.5">
                <input
                    bind:value={email}
                    onblur={() => (touchedEmail = true)}
                    type="email"
                    id="email"
                    name="email"
                    autocomplete="email"
                    placeholder="you@example.com"
                    disabled={formSubmitted}
                    required
                    class="w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {emailInvalid
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                />
            </div>
            {#if emailInvalid}
                <p class="mt-1 text-xs text-rose-500">
                    Please enter a valid email address.
                </p>
            {/if}
        </div>

        <div>
            <label
                for="master-password"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Master password
            </label>
            <div class="relative mt-1.5">
                <input
                    bind:value={masterPassword}
                    onblur={() => (touchedPassword = true)}
                    type={showPassword ? "text" : "password"}
                    id="master-password"
                    name="master-password"
                    autocomplete="current-password"
                    placeholder="••••••••••••"
                    disabled={formSubmitted}
                    required
                    class="w-full rounded-xl border bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {passwordInvalid
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                />
                <button
                    type="button"
                    aria-label={showPassword ? "Hide master password" : "Show master password"}
                    onclick={() => (showPassword = !showPassword)}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon
                        icon="hugeicons:{showPassword ? 'view-off-slash' : 'view'}"
                        width="18"
                        height="18"
                    />
                </button>
            </div>
            {#if passwordInvalid}
                <p class="mt-1 text-xs text-rose-500">
                    Master password is required.
                </p>
            {/if}
        </div>

        {#if enableTurnstile}
            {#key loginError}
                <div class="pt-1">
                    <Turnstile
                        sitekey={PUBLIC_CF_TURNSTILE_SITE_KEY}
                        action="login"
                        callback={(cfToken) => {
                            cfTurnsTileToken = cfToken;
                        }}
                    />
                </div>
            {/key}
        {/if}

        {#if formSubmitted && cryptoStep}
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
            disabled={formSubmitted || !isFormValid || (enableTurnstile && cfTurnsTileToken == null)}
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
            {#if formSubmitted}
                <span>Unlocking Vault...</span>
            {:else}
                <Icon icon="hugeicons:login-01" width="18" height="18" />
                <span>Sign In</span>
            {/if}
        </button>

        <p class="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            New to MellonPass?
            <a
                href="/sign-up"
                class="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 ml-1"
            >
                Create an account
            </a>
        </p>
    </form>
</div>

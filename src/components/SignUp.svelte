<script lang="ts">
    import {
        PUBLIC_CF_ENABLE_TURNSTILE,
        PUBLIC_CF_TURNSTILE_SITE_KEY,
    } from "$env/static/public";
    import Icon from "@iconify/svelte";
    import { checkEmail, createAccount } from "$lib/services/accounts";
    import Turnstile from "./Turnstile.svelte";

    let name = $state("");
    let email = $state("");
    let touchedName = $state(false);
    let touchedEmail = $state(false);

    let checkingEmail = $state(false);
    let emailAvailable: boolean | null = $state(null);
    let emailCheckTimer: ReturnType<typeof setTimeout> | null = null;

    let signUpSuccessful = $state(false);
    let cfTurnsTileToken: string | null = $state(null);
    const serverErrors: Array<{ message: string }> = $state([]);
    let formSubmitted = $state(false);

    const enableTurnstile = PUBLIC_CF_ENABLE_TURNSTILE == "true";

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isNameValid = $derived(name.trim().length > 0);
    const isEmailSyntaxValid = $derived(emailRegex.test(email.trim()));
    const isFormValid = $derived(
        isNameValid && isEmailSyntaxValid && emailAvailable !== false
    );

    function handleEmailInput() {
        emailAvailable = null;
        if (emailCheckTimer) clearTimeout(emailCheckTimer);

        const trimmed = email.trim();
        if (!emailRegex.test(trimmed)) return;

        checkingEmail = true;
        emailCheckTimer = setTimeout(async () => {
            try {
                emailAvailable = await checkEmail(trimmed);
            } catch {
                emailAvailable = true;
            } finally {
                checkingEmail = false;
            }
        }, 350);
    }

    const handleSignUpSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        touchedName = true;
        touchedEmail = true;

        if (!isFormValid) return;

        formSubmitted = true;
        serverErrors.length = 0;

        try {
            await createAccount(
                name.trim(),
                email.trim(),
                cfTurnsTileToken ?? undefined
            );
            signUpSuccessful = true;
        } catch (error: any) {
            const error_ = error.error;
            cfTurnsTileToken = null;
            serverErrors.length = 0;
            if (typeof error_ === "object" && error_ !== null) {
                Object.keys(error_).forEach((key) => {
                    const key_ = key.charAt(0).toUpperCase() + key.slice(1);
                    serverErrors.push({
                        message: `${key_}: ${error_[key].join("; ")}`,
                    });
                });
            } else {
                serverErrors.push({
                    message: error_ || "Unable to create account.",
                });
            }
        } finally {
            formSubmitted = false;
        }
    };
</script>

{#if !signUpSuccessful}
    <div>
        <header class="text-center">
            <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Icon icon="hugeicons:user-add-01" width="24" height="24" />
            </div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">
                Create your account
            </h1>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Start protecting your credentials with zero-knowledge encryption
            </p>
        </header>

        {#if serverErrors.length > 0}
            <div class="mt-4 space-y-2">
                {#each serverErrors as error (error.message)}
                    <div
                        role="alert"
                        class="flex items-start gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
                    >
                        <Icon
                            icon="hugeicons:alert-02"
                            width="16"
                            height="16"
                            class="mt-0.5 shrink-0 text-rose-500"
                        />
                        <span>{error.message}</span>
                    </div>
                {/each}
            </div>
        {/if}

        <form
            id="signup-form"
            class="mt-6 space-y-4"
            method="post"
            onsubmit={handleSignUpSubmit}
            novalidate
        >
            <div>
                <label
                    for="name"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Full name
                </label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Ada Lovelace"
                    bind:value={name}
                    onblur={() => (touchedName = true)}
                    required
                    class="mt-1.5 w-full rounded-xl border bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {touchedName && !isNameValid
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                />
                {#if touchedName && !isNameValid}
                    <p class="mt-1 text-xs text-rose-500">
                        Please enter your name.
                    </p>
                {/if}
            </div>

            <div>
                <label
                    for="email"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Email address
                </label>
                <div class="relative mt-1.5">
                    <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        bind:value={email}
                        oninput={handleEmailInput}
                        onblur={() => (touchedEmail = true)}
                        required
                        class="w-full rounded-xl border bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {(touchedEmail && !isEmailSyntaxValid) || emailAvailable === false
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                    />
                    {#if checkingEmail}
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon icon="hugeicons:loading-03" width="16" height="16" class="animate-spin" />
                        </div>
                    {:else if isEmailSyntaxValid && emailAvailable === true}
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" title="Email available">
                            <Icon icon="hugeicons:tick-02" width="18" height="18" />
                        </div>
                    {/if}
                </div>

                {#if touchedEmail && !isEmailSyntaxValid}
                    <p class="mt-1 text-xs text-rose-500">
                        Please enter a valid email address.
                    </p>
                {:else if emailAvailable === false}
                    <p class="mt-1 text-xs text-rose-500">
                        This email is already registered. Try signing in instead.
                    </p>
                {/if}
            </div>

            {#if enableTurnstile}
                {#key serverErrors.length}
                    <div class="pt-1">
                        <Turnstile
                            sitekey={PUBLIC_CF_TURNSTILE_SITE_KEY}
                            action="signup"
                            callback={(cfToken) => {
                                cfTurnsTileToken = cfToken;
                            }}
                        />
                    </div>
                {/key}
            {/if}

            <button
                type="submit"
                disabled={formSubmitted || !isFormValid || (enableTurnstile && cfTurnsTileToken == null)}
                class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
            >
                {#if formSubmitted}
                    <Icon icon="hugeicons:loading-03" width="18" height="18" class="animate-spin" />
                    <span>Creating account...</span>
                {:else}
                    <span>Continue</span>
                    <Icon icon="hugeicons:arrow-right-01" width="18" height="18" />
                {/if}
            </button>

            <p class="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Already have an account?
                <a
                    href="/login"
                    class="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 ml-1"
                >
                    Sign in
                </a>
            </p>
        </form>
    </div>
{:else}
    <div class="text-center py-2">
        <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Icon icon="hugeicons:mail-validation-01" width="28" height="28" />
        </div>
        <h2 class="mt-4 text-xl font-bold text-slate-900 dark:text-white">
            Check your email
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            We sent a verification link to <strong class="font-semibold text-slate-900 dark:text-white">{email}</strong>. Click the link in that email to set up your master password and encryption keys.
        </p>

        <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <p class="text-xs text-slate-500 dark:text-slate-400">
                Already verified your account?
                <a
                    href="/login"
                    class="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 ml-1"
                >
                    Log in
                </a>
            </p>
        </div>
    </div>
{/if}

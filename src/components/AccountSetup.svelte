<script lang="ts">
    import Icon from "@iconify/svelte";
    import { createAnimationTriggerAction } from "svelte-trigger-action";
    import { deriveSetupKeysAsync } from "$lib/crypto-client";
    import { setupAccount } from "$lib/services/accounts";

    const { verifiedEmail } = $props();

    const { triggerAnimation, animationAction } = createAnimationTriggerAction();

    const HINT_LIMIT = 50;

    const mpRules = {
        hasMinChar: /^.{12,}$/, // min of 12 characters.
        hasUpperCase: /[A-Z]/,
        hasMultiUppercase: /(?=(.*[A-Z]){2})/,
        hasSpecialChar: /\W+/,
        hasMultiSpecialChar: /[^a-zA-Z0-9\s].*[^a-zA-Z0-9\s]/,
        hasDigit: /\d/,
        hasMultiDigit: /\d{2,}/,
    };

    let mpFieldVal: string = $state("");
    let mpFieldToggle = $state(false);
    let touchedMp = $state(false);

    let mpcFieldVal: string = $state("");
    let mpcFieldToggle = $state(false);
    let touchedMpc = $state(false);

    let mphFieldVal = $state("");
    let setupAccountError: string | null = $state(null);
    let formSubmitted = $state(false);
    let cryptoStep = $state("");
    let cryptoPercent = $state(0);

    const points = $derived.by(() => {
        if (!mpFieldVal || !mpRules.hasMinChar.test(mpFieldVal)) return 0;
        let p = 0;
        for (const regex of Object.values(mpRules)) {
            if (regex.test(mpFieldVal)) p++;
        }
        return p;
    });

    const strengthMeta = $derived.by(() => {
        if (!mpFieldVal) return { label: "Enter 12+ characters", color: "bg-slate-200 dark:bg-slate-800", text: "text-slate-400" };
        if (points <= 2) return { label: "Weak", color: "bg-rose-500", text: "text-rose-500" };
        if (points === 3) return { label: "Fair (Needs more variety)", color: "bg-amber-500", text: "text-amber-500" };
        if (points <= 5) return { label: "Good", color: "bg-sky-500", text: "text-sky-500" };
        return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-500" };
    });

    const mpFieldInvalid = $derived(touchedMp && !mpRules.hasMinChar.test(mpFieldVal));
    const mpcFieldInvalid = $derived(touchedMpc && mpcFieldVal !== mpFieldVal);

    const handleMphInput = () => {
        if (mphFieldVal.length > HINT_LIMIT) {
            mphFieldVal = mphFieldVal.slice(0, HINT_LIMIT);
        }
    };

    const onFormSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        touchedMp = true;
        touchedMpc = true;

        if (!mpRules.hasMinChar.test(mpFieldVal) || mpcFieldVal !== mpFieldVal) {
            triggerAnimation("shake");
            return;
        }

        if (points <= 3) {
            triggerAnimation("shake");
            return;
        }

        formSubmitted = true;
        setupAccountError = null;
        cryptoStep = "Starting zero-knowledge key generation...";
        cryptoPercent = 10;

        try {
            const {
                loginHash,
                epsk,
                rsaProtectedKey,
                rsaEncodedPublicKey,
            } = await deriveSetupKeysAsync(
                verifiedEmail,
                mpFieldVal,
                (step, percent) => {
                    cryptoStep = step;
                    cryptoPercent = percent;
                }
            );

            cryptoStep = "Saving encrypted vault keys...";
            cryptoPercent = 98;

            await setupAccount(
                verifiedEmail,
                loginHash,
                epsk,
                mphFieldVal,
                rsaProtectedKey,
                rsaEncodedPublicKey
            );
            window.location.assign("/login");
        } catch (error: any) {
            setupAccountError =
                typeof error?.error === "string"
                    ? error.error
                    : "Unable to complete account setup. Please try again.";
            formSubmitted = false;
            cryptoStep = "";
            cryptoPercent = 0;
        }
    };
</script>

<div>
    <header class="text-center">
        <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
            <Icon icon="hugeicons:shield-key" width="24" height="24" />
        </div>
        <h1 class="text-xl font-bold text-slate-900 dark:text-white">
            Set up your Master Password
        </h1>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Configuring zero-knowledge vault for <strong class="text-slate-700 dark:text-slate-200">{verifiedEmail}</strong>
        </p>
    </header>

    <form class="mt-6 space-y-4" onsubmit={onFormSubmit} novalidate>
        {#if setupAccountError}
            <div
                role="alert"
                class="flex items-start justify-between gap-2.5 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300"
            >
                <div class="flex items-start gap-2">
                    <Icon icon="hugeicons:alert-02" width="16" height="16" class="mt-0.5 shrink-0 text-rose-500" />
                    <span>{setupAccountError}</span>
                </div>
                <button
                    type="button"
                    aria-label="Close alert"
                    onclick={() => (setupAccountError = null)}
                    class="text-rose-400 hover:text-rose-600 cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="14" height="14" />
                </button>
            </div>
        {/if}

        <!-- Master Password -->
        <div>
            <label
                for="master-password"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Master password
            </label>
            <div class="relative mt-1.5" use:animationAction>
                <input
                    id="master-password"
                    name="master-password"
                    type={mpFieldToggle ? "text" : "password"}
                    placeholder="Minimum 12 characters"
                    bind:value={mpFieldVal}
                    onblur={() => (touchedMp = true)}
                    disabled={formSubmitted}
                    required
                    class="w-full rounded-xl border bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {mpFieldInvalid
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                />
                <button
                    type="button"
                    aria-label="Toggle master password visibility"
                    onclick={() => (mpFieldToggle = !mpFieldToggle)}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                    <Icon
                        icon="hugeicons:{mpFieldToggle ? 'view-off-slash' : 'view'}"
                        width="18"
                        height="18"
                    />
                </button>
            </div>

            <!-- Strength Meter -->
            <div class="mt-2.5">
                <div class="flex items-center justify-between text-[11px]">
                    <span class="font-medium {strengthMeta.text}">{strengthMeta.label}</span>
                    <span class="text-slate-400">{mpFieldVal.length} chars</span>
                </div>
                <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                        class="h-full transition-all duration-300 {strengthMeta.color}"
                        style="width: {Math.min(100, (points / 7) * 100)}%;"
                    ></div>
                </div>
            </div>

            <!-- Interactive Requirements Pills -->
            <div class="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                <div class="flex items-center gap-1.5 {mpRules.hasMinChar.test(mpFieldVal) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                    <Icon icon={mpRules.hasMinChar.test(mpFieldVal) ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                    <span>12+ characters</span>
                </div>
                <div class="flex items-center gap-1.5 {mpRules.hasUpperCase.test(mpFieldVal) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                    <Icon icon={mpRules.hasUpperCase.test(mpFieldVal) ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                    <span>Uppercase letters</span>
                </div>
                <div class="flex items-center gap-1.5 {mpRules.hasDigit.test(mpFieldVal) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                    <Icon icon={mpRules.hasDigit.test(mpFieldVal) ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                    <span>Numbers (0–9)</span>
                </div>
                <div class="flex items-center gap-1.5 {mpRules.hasSpecialChar.test(mpFieldVal) ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                    <Icon icon={mpRules.hasSpecialChar.test(mpFieldVal) ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                    <span>Special symbols</span>
                </div>
            </div>

            <div class="mt-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                <strong>Zero-Knowledge Notice:</strong> Your master password is never sent to our servers and cannot be recovered if forgotten.
            </div>
        </div>

        <!-- Confirm Master Password -->
        <div>
            <label
                for="confirm-password"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Confirm master password
            </label>
            <div class="relative mt-1.5">
                <input
                    id="confirm-password"
                    name="confirm-password"
                    type={mpcFieldToggle ? "text" : "password"}
                    placeholder="Re-enter master password"
                    bind:value={mpcFieldVal}
                    onblur={() => (touchedMpc = true)}
                    disabled={formSubmitted}
                    required
                    class="w-full rounded-xl border bg-white dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 {mpcFieldInvalid
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                />
                <button
                    type="button"
                    aria-label="Toggle confirm password visibility"
                    onclick={() => (mpcFieldToggle = !mpcFieldToggle)}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                    <Icon
                        icon="hugeicons:{mpcFieldToggle ? 'view-off-slash' : 'view'}"
                        width="18"
                        height="18"
                    />
                </button>
            </div>
            {#if mpcFieldInvalid}
                <p class="mt-1 text-xs text-rose-500">
                    Master passwords do not match.
                </p>
            {/if}
        </div>

        <!-- Master Password Hint -->
        <div>
            <div class="flex items-center justify-between">
                <label
                    for="hint"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Master password hint <span class="font-normal text-slate-400">(optional)</span>
                </label>
                <span class="text-[11px] text-slate-400">
                    {mphFieldVal.length}/{HINT_LIMIT}
                </span>
            </div>
            <input
                id="hint"
                name="hint"
                type="text"
                placeholder="A memorable clue (never your actual password)"
                oninput={handleMphInput}
                bind:value={mphFieldVal}
                disabled={formSubmitted}
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>

        {#if formSubmitted && cryptoStep}
            <div class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5">
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
            disabled={formSubmitted}
            class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
            {#if formSubmitted}
                <span>Generating Encryption Keys...</span>
            {:else}
                <Icon icon="hugeicons:checkmark-circle-02" width="18" height="18" />
                <span>Complete Vault Setup</span>
            {/if}
        </button>
    </form>
</div>

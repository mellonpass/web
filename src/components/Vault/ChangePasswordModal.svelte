<script lang="ts">
    import { getContext, onDestroy, untrack } from "svelte";
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import { evaluatePasswordStrength } from "$lib/password-generator";
    import { getErrorMessage } from "$lib/requests";
    import { whoami as fetchWhoami } from "$lib/services/accounts";
    import { isChangePasswordModalOpen } from "$lib/stores";
    import { toast } from "$lib/toast.svelte";
    import { rotateMasterPassword } from "$lib/vaults";

    const HINT_LIMIT = 50;
    const MIN_PASSWORD_LENGTH = 12;

    const getMasterKeyState = getContext<
        (() => { mk: string | null; epsk: string | null }) | undefined
    >("getMasterKeyState");
    const updateMasterKeyState = getContext<
        ((newMk: string, newEpsk: string) => void) | undefined
    >("updateMasterKeyState");
    const fallbackMk = getContext<string | undefined>("mk");
    const fallbackEpsk = getContext<string | undefined>("epsk");

    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let hint = $state("");

    let showCurrent = $state(false);
    let showNew = $state(false);
    let showConfirm = $state(false);

    let touchedCurrent = $state(false);
    let touchedNew = $state(false);
    let touchedConfirm = $state(false);

    let submitting = $state(false);
    let cryptoStep = $state("");
    let cryptoPercent = $state(0);
    let errorMsg: string | null = $state(null);
    let accountEmail = $state("");

    let modalSession = 0;
    let isDestroyed = false;
    let activeAbortController: AbortController | null = null;

    const strength = $derived(evaluatePasswordStrength(newPassword));
    const hasMinLength = $derived(newPassword.length >= MIN_PASSWORD_LENGTH);
    const hasUppercase = $derived(/[A-Z]/.test(newPassword));
    const hasDigit = $derived(/\d/.test(newPassword));
    const hasSymbol = $derived(/[^a-zA-Z0-9\s]/.test(newPassword));
    const differsFromCurrent = $derived(
        newPassword.length > 0 && newPassword !== currentPassword
    );
    const hintMatchesPassword = $derived(
        hint.trim().length > 0 &&
            (hint === newPassword || hint.trim() === newPassword.trim())
    );

    const currentInvalid = $derived(
        touchedCurrent && currentPassword.length === 0
    );
    const newInvalid = $derived(
        touchedNew &&
            (!hasMinLength ||
                strength.score < 2 ||
                (currentPassword.length > 0 && newPassword === currentPassword))
    );
    const confirmInvalid = $derived(
        touchedConfirm && confirmPassword !== newPassword
    );

    const isFormReady = $derived(
        currentPassword.length > 0 &&
            hasMinLength &&
            strength.score >= 2 &&
            newPassword !== currentPassword &&
            confirmPassword === newPassword &&
            !hintMatchesPassword
    );

    function readLocalIdentity(): string {
        try {
            const raw = localStorage.getItem("whoami");
            const parsed = raw ? JSON.parse(raw) : null;
            return typeof parsed?.identity === "string" ? parsed.identity : "";
        } catch {
            return "";
        }
    }

    async function resolveAccountEmail(): Promise<string> {
        const cached = readLocalIdentity();
        if (cached) return cached;

        const resp = await fetchWhoami();
        const identity = resp?.data?.identity;
        if (typeof identity === "string" && identity) {
            try {
                const payload = { ...resp.data };
                delete payload.auth;
                localStorage.setItem("whoami", JSON.stringify(payload));
            } catch {
                // Ignore storage errors
            }
            return identity;
        }

        throw new Error(
            "Unable to determine your account email. Please sign in again."
        );
    }

    function resetFormState() {
        currentPassword = "";
        newPassword = "";
        confirmPassword = "";
        hint = "";
        showCurrent = false;
        showNew = false;
        showConfirm = false;
        touchedCurrent = false;
        touchedNew = false;
        touchedConfirm = false;
        submitting = false;
        cryptoStep = "";
        cryptoPercent = 0;
        errorMsg = null;
    }

    function abortInFlight() {
        if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
        }
    }

    $effect(() => {
        if ($isChangePasswordModalOpen) {
            untrack(() => {
                modalSession++;
                accountEmail = readLocalIdentity();
            });
        } else {
            untrack(() => {
                modalSession++;
                abortInFlight();
                resetFormState();
            });
        }
    });

    onDestroy(() => {
        isDestroyed = true;
        modalSession++;
        abortInFlight();
        resetFormState();
    });

    function handleHintInput() {
        if (hint.length > HINT_LIMIT) {
            hint = hint.slice(0, HINT_LIMIT);
        }
        errorMsg = null;
    }

    const GENERIC_HTTP_ERRORS = new Set([
        "request failed.",
        "unauthorized",
        "forbidden",
        "unprocessable entity",
        "unprocessable content",
        "too many requests",
    ]);

    function getSpecificErrorMessage(err: unknown, fallback: string): string {
        const message = getErrorMessage(err, "").trim();
        if (!message || GENERIC_HTTP_ERRORS.has(message.toLowerCase())) {
            return fallback;
        }
        return message;
    }

    function formatChangePasswordError(err: unknown): string {
        if (err && typeof err === "object" && "statusCode" in err) {
            const record = err as { statusCode?: number; error?: unknown };
            if (record.statusCode === 401) {
                return getSpecificErrorMessage(
                    err,
                    "Authentication required. Please sign in again."
                );
            }
            if (record.statusCode === 403) {
                return getSpecificErrorMessage(
                    err,
                    "Security verification failed. Please refresh and try again."
                );
            }
            if (record.statusCode === 422) {
                return getSpecificErrorMessage(
                    err,
                    "Invalid current master password."
                );
            }
            if (record.statusCode === 429) {
                return getSpecificErrorMessage(
                    err,
                    "Too many password change attempts. Please try again later."
                );
            }
        }
        return getSpecificErrorMessage(
            err,
            "Unable to change master password. Please try again."
        );
    }

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        if (submitting) return;
        touchedCurrent = true;
        touchedNew = true;
        touchedConfirm = true;
        errorMsg = null;

        if (!currentPassword) {
            errorMsg = "Please enter your current master password.";
            return;
        }
        if (!hasMinLength || strength.score < 2) {
            errorMsg = `New master password must be at least ${MIN_PASSWORD_LENGTH} characters and stronger than Weak.`;
            return;
        }
        if (newPassword === currentPassword) {
            errorMsg =
                "New master password must be different from your current master password.";
            return;
        }
        if (confirmPassword !== newPassword) {
            errorMsg = "New master passwords do not match.";
            return;
        }
        if (hintMatchesPassword) {
            errorMsg = "Password hint must not match your master password.";
            return;
        }

        const keyState = getMasterKeyState?.() ?? {
            mk: fallbackMk ?? null,
            epsk: fallbackEpsk ?? null,
        };
        if (!keyState.mk || !keyState.epsk) {
            errorMsg = "Vault is locked. Please unlock your vault first.";
            return;
        }

        const session = modalSession;
        const abortController = new AbortController();
        activeAbortController = abortController;
        submitting = true;
        cryptoStep = "Preparing zero-knowledge key rotation...";
        cryptoPercent = 5;

        try {
            const email = accountEmail || (await resolveAccountEmail());
            if (isDestroyed || session !== modalSession) return;
            accountEmail = email;

            const trimmedHint = hint.trim();
            const result = await rotateMasterPassword({
                email,
                currentMasterPassword: currentPassword,
                newMasterPassword: newPassword,
                currentMkBase64: keyState.mk,
                currentEpsk: keyState.epsk,
                hint: trimmedHint.length > 0 ? trimmedHint : undefined,
                onProgress: (step, percent) => {
                    if (!isDestroyed && session === modalSession) {
                        cryptoStep = step;
                        cryptoPercent = percent;
                    }
                },
                signal: abortController.signal,
                isAborted: () => isDestroyed || session !== modalSession,
            });

            if (
                result.aborted ||
                isDestroyed ||
                session !== modalSession ||
                !result.newMkBase64 ||
                !result.newEpsk
            ) {
                return;
            }

            const updatedMk = result.newMkBase64;
            const updatedEpsk = result.newEpsk;

            resetFormState();
            $isChangePasswordModalOpen = false;
            updateMasterKeyState?.(updatedMk, updatedEpsk);

            toast.show({
                title: "Master password updated",
                description:
                    "Your vault SymmetricKey was re-wrapped without re-encrypting items.",
                variant: "success",
            });
        } catch (err: unknown) {
            if (isDestroyed || session !== modalSession) return;
            errorMsg = formatChangePasswordError(err);
        } finally {
            if (activeAbortController === abortController) {
                activeAbortController = null;
            }
            if (!isDestroyed && session === modalSession) {
                submitting = false;
                cryptoStep = "";
                cryptoPercent = 0;
            }
        }
    }
</script>

<Dialog.Root bind:open={$isChangePasswordModalOpen}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            onInteractOutside={(e) => {
                if (submitting) e.preventDefault();
            }}
            onEscapeKeydown={(e) => {
                if (submitting) e.preventDefault();
            }}
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl focus:outline-none"
        >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Icon icon="hugeicons:key-01" width="20" height="20" />
                    </div>
                    <div class="min-w-0">
                        <Dialog.Title class="text-base font-bold text-slate-900 dark:text-white">
                            Change Master Password
                        </Dialog.Title>
                        <Dialog.Description class="truncate text-xs text-slate-500 dark:text-slate-400">
                            {accountEmail
                                ? `Re-wrap vault encryption key for ${accountEmail}`
                                : "Rotate your authentication hash and re-wrap your vault key"}
                        </Dialog.Description>
                    </div>
                </div>
                <Dialog.Close
                    disabled={submitting}
                    aria-label="Close change master password dialog"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                </Dialog.Close>
            </div>

            <!-- Form Body -->
            <form onsubmit={handleSubmit} novalidate class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {#if errorMsg}
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
                        <span>{errorMsg}</span>
                    </div>
                {/if}

                <!-- Current Master Password -->
                <div>
                    <label
                        for="change-current-password"
                        class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                        Current master password
                    </label>
                    <div class="relative mt-1.5">
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                            id="change-current-password"
                            type={showCurrent ? "text" : "password"}
                            bind:value={currentPassword}
                            oninput={() => (errorMsg = null)}
                            onblur={() => (touchedCurrent = true)}
                            autocomplete="current-password"
                            placeholder="Enter current master password"
                            disabled={submitting}
                            autofocus
                            required
                            class="w-full rounded-xl border bg-slate-50/70 dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 {currentInvalid
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                        />
                        <button
                            type="button"
                            aria-label={showCurrent ? "Hide current master password" : "Show current master password"}
                            onclick={() => (showCurrent = !showCurrent)}
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <Icon
                                icon="hugeicons:{showCurrent ? 'view-off-slash' : 'view'}"
                                width="18"
                                height="18"
                            />
                        </button>
                    </div>
                    {#if currentInvalid}
                        <p class="mt-1 text-xs text-rose-500">
                            Current master password is required.
                        </p>
                    {/if}
                </div>

                <!-- New Master Password + Strength Meter -->
                <div>
                    <label
                        for="change-new-password"
                        class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                        New master password
                    </label>
                    <div class="relative mt-1.5">
                        <input
                            id="change-new-password"
                            type={showNew ? "text" : "password"}
                            bind:value={newPassword}
                            oninput={() => (errorMsg = null)}
                            onblur={() => (touchedNew = true)}
                            autocomplete="new-password"
                            placeholder="Minimum 12 characters"
                            disabled={submitting}
                            required
                            class="w-full rounded-xl border bg-slate-50/70 dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 {newInvalid
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                        />
                        <button
                            type="button"
                            aria-label={showNew ? "Hide new master password" : "Show new master password"}
                            onclick={() => (showNew = !showNew)}
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <Icon
                                icon="hugeicons:{showNew ? 'view-off-slash' : 'view'}"
                                width="18"
                                height="18"
                            />
                        </button>
                    </div>

                    <!-- Strength Meter (reusing password-generator.ts evaluator) -->
                    <div class="mt-2.5">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="font-semibold {newPassword
                                ? strength.colorClass.split(' ')[0]
                                : 'text-slate-400'}">
                                {newPassword ? strength.label : "Enter 12+ characters"}
                            </span>
                            <span class="font-mono text-slate-400 dark:text-slate-500">
                                {#if newPassword}
                                    ~{strength.entropyBits} bits • {newPassword.length} chars
                                {:else}
                                    0 chars
                                {/if}
                            </span>
                        </div>
                        <div class="mt-1.5 grid grid-cols-4 gap-1.5">
                            {#each [1, 2, 3, 4] as step}
                                <div
                                    class="h-1.5 rounded-full transition-colors {newPassword && strength.score >= step
                                        ? strength.colorClass.split(' ')[1]
                                        : 'bg-slate-200 dark:bg-slate-800'}"
                                ></div>
                            {/each}
                        </div>
                    </div>

                    <!-- Password Policy Checks -->
                    <div class="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                        <div class="flex items-center gap-1.5 {hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                            <Icon icon={hasMinLength ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                            <span>12+ characters</span>
                        </div>
                        <div class="flex items-center gap-1.5 {hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                            <Icon icon={hasUppercase ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                            <span>Uppercase letters</span>
                        </div>
                        <div class="flex items-center gap-1.5 {hasDigit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                            <Icon icon={hasDigit ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                            <span>Numbers (0–9)</span>
                        </div>
                        <div class="flex items-center gap-1.5 {hasSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}">
                            <Icon icon={hasSymbol ? "hugeicons:tick-02" : "hugeicons:circle"} width="13" height="13" />
                            <span>Special symbols</span>
                        </div>
                    </div>

                    {#if newPassword && currentPassword && !differsFromCurrent}
                        <p class="mt-1.5 text-xs text-rose-500">
                            New master password must differ from your current password.
                        </p>
                    {:else if touchedNew && (!hasMinLength || strength.score < 2)}
                        <p class="mt-1.5 text-xs text-rose-500">
                            New master password must be at least {MIN_PASSWORD_LENGTH} characters and stronger than Weak.
                        </p>
                    {/if}
                </div>

                <!-- Confirm New Master Password -->
                <div>
                    <label
                        for="change-confirm-password"
                        class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                        Confirm new master password
                    </label>
                    <div class="relative mt-1.5">
                        <input
                            id="change-confirm-password"
                            type={showConfirm ? "text" : "password"}
                            bind:value={confirmPassword}
                            oninput={() => (errorMsg = null)}
                            onblur={() => (touchedConfirm = true)}
                            autocomplete="new-password"
                            placeholder="Re-enter new master password"
                            disabled={submitting}
                            required
                            class="w-full rounded-xl border bg-slate-50/70 dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 {confirmInvalid
                                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                                : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                        />
                        <button
                            type="button"
                            aria-label={showConfirm ? "Hide confirm master password" : "Show confirm master password"}
                            onclick={() => (showConfirm = !showConfirm)}
                            class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                        >
                            <Icon
                                icon="hugeicons:{showConfirm ? 'view-off-slash' : 'view'}"
                                width="18"
                                height="18"
                            />
                        </button>
                    </div>
                    {#if confirmInvalid}
                        <p class="mt-1 text-xs text-rose-500">
                            New master passwords do not match.
                        </p>
                    {/if}
                </div>

                <!-- Optional Password Hint -->
                <div>
                    <div class="flex items-center justify-between">
                        <label
                            for="change-password-hint"
                            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                            Master password hint <span class="font-normal text-slate-400">(optional)</span>
                        </label>
                        <span class="text-[11px] text-slate-400">
                            {hint.length}/{HINT_LIMIT}
                        </span>
                    </div>
                    <input
                        id="change-password-hint"
                        type="text"
                        maxlength={HINT_LIMIT}
                        bind:value={hint}
                        oninput={handleHintInput}
                        disabled={submitting}
                        placeholder="Leave blank to keep existing hint"
                        class="mt-1.5 w-full rounded-xl border bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 {hintMatchesPassword
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
                    />
                    {#if hintMatchesPassword}
                        <p class="mt-1 text-xs text-rose-500">
                            Hint must not match your master password.
                        </p>
                    {/if}
                </div>

                <!-- Zero-Knowledge & Rotation Info -->
                <div class="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3.5 py-2.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    <strong>Zero-Knowledge Rotation:</strong> Your vault encryption key is re-wrapped locally in your browser. Existing vault items and organization keys stay encrypted, and all other active sessions will be signed out.
                </div>

                <!-- Progress Bar -->
                {#if submitting && cryptoStep}
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

                <!-- Actions -->
                <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        disabled={submitting}
                        onclick={() => ($isChangePasswordModalOpen = false)}
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !isFormReady}
                        class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                        <Icon icon={submitting ? "hugeicons:loading-03" : "hugeicons:checkmark-circle-02"} width="15" height="15" class={submitting ? "animate-spin" : ""} />
                        <span>{submitting ? "Rotating Password..." : "Update Master Password"}</span>
                    </button>
                </div>
            </form>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

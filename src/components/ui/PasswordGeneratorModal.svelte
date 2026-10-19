<script lang="ts">
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import {
        DEFAULT_GENERATOR_OPTIONS,
        evaluatePasswordStrength,
        generateSecret,
        tokenizeSecretForDisplay,
        type PasswordGeneratorOptions,
    } from "$lib/password-generator";
    import { toast } from "$lib/toast.svelte";

    let {
        open = $bindable(false),
        onSelectPassword = undefined,
    }: {
        open?: boolean;
        onSelectPassword?: ((password: string) => void) | undefined;
    } = $props();

    let options: PasswordGeneratorOptions = $state({ ...DEFAULT_GENERATOR_OPTIONS });
    let generated = $state(generateSecret(DEFAULT_GENERATOR_OPTIONS));

    const strength = $derived(evaluatePasswordStrength(generated));
    const tokens = $derived(tokenizeSecretForDisplay(generated));

    function regenerate() {
        generated = generateSecret(options);
    }

    $effect(() => {
        // Track all option fields and regenerate automatically
        const _snapshot = {
            mode: options.mode,
            length: options.length,
            uppercase: options.uppercase,
            lowercase: options.lowercase,
            digits: options.digits,
            symbols: options.symbols,
            avoidAmbiguous: options.avoidAmbiguous,
            wordCount: options.wordCount,
            separator: options.separator,
            capitalizeWords: options.capitalizeWords,
            includeNumberInPassphrase: options.includeNumberInPassphrase,
        };
        if (_snapshot) {
            generated = generateSecret(options);
        }
    });

    function handleCopy() {
        toast.copySecret(generated, "Generated password", true);
    }

    function handleUsePassword() {
        if (onSelectPassword) {
            onSelectPassword(generated);
        } else {
            toast.copySecret(generated, "Generated password", true);
        }
        open = false;
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl focus:outline-none"
        >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div class="flex items-center gap-2.5">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Icon icon="hugeicons:magic-wand-01" width="20" height="20" />
                    </div>
                    <div>
                        <Dialog.Title class="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Password Generator
                        </Dialog.Title>
                        <Dialog.Description class="text-xs text-slate-500 dark:text-slate-400">
                            Cryptographically random credentials
                        </Dialog.Description>
                    </div>
                </div>
                <Dialog.Close
                    aria-label="Close password generator"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                </Dialog.Close>
            </div>

            <!-- Generated Output Box -->
            <div class="mt-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-4">
                <div class="flex items-start justify-between gap-3">
                    <div
                        class="font-mono text-base font-medium leading-relaxed break-all select-all flex-1 min-h-[3rem] flex flex-wrap items-center content-center"
                    >
                        {#each tokens as token}
                            <span
                                class={token.type === "digit"
                                    ? "text-sky-600 dark:text-sky-400"
                                    : token.type === "symbol"
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-slate-900 dark:text-slate-100"}
                            >{token.char}</span>
                        {/each}
                    </div>
                    <div class="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            onclick={regenerate}
                            title="Regenerate"
                            aria-label="Regenerate password"
                            class="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <Icon icon="hugeicons:refresh" width="18" height="18" />
                        </button>
                        <button
                            type="button"
                            onclick={handleCopy}
                            title="Copy to clipboard"
                            aria-label="Copy generated password"
                            class="rounded-lg p-2 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <Icon icon="hugeicons:copy-01" width="18" height="18" />
                        </button>
                    </div>
                </div>

                <!-- Entropy & Strength Bar -->
                <div class="mt-3 flex items-center justify-between text-xs">
                    <span class="font-medium text-slate-600 dark:text-slate-400">
                        Strength: <strong class="text-slate-900 dark:text-slate-200">{strength.label}</strong>
                    </span>
                    <span class="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        ~{strength.entropyBits} bits of entropy
                    </span>
                </div>
                <div class="mt-1.5 grid grid-cols-4 gap-1.5">
                    {#each [1, 2, 3, 4] as step}
                        <div
                            class="h-1.5 rounded-full transition-colors {strength.score >= step
                                ? strength.colorClass.split(' ')[1]
                                : 'bg-slate-200 dark:bg-slate-800'}"
                        ></div>
                    {/each}
                </div>
            </div>

            <!-- Mode Selector -->
            <div class="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
                <button
                    type="button"
                    onclick={() => (options.mode = "password")}
                    class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {options.mode === 'password'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
                >
                    Random Password
                </button>
                <button
                    type="button"
                    onclick={() => (options.mode = "passphrase")}
                    class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {options.mode === 'passphrase'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
                >
                    Memorable Passphrase
                </button>
            </div>

            {#if options.mode === "password"}
                <div class="mt-4 space-y-4">
                    <div>
                        <div class="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                            <label for="pw-length">Length</label>
                            <span class="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {options.length} chars
                            </span>
                        </div>
                        <input
                            id="pw-length"
                            type="range"
                            min="8"
                            max="64"
                            bind:value={options.length}
                            class="mt-2 w-full accent-indigo-600 cursor-pointer"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-2.5 text-xs">
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.uppercase} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Uppercase (A–Z)</span>
                        </label>
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.lowercase} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Lowercase (a–z)</span>
                        </label>
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.digits} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Numbers (0–9)</span>
                        </label>
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.symbols} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Symbols (!@#$)</span>
                        </label>
                    </div>

                    <label class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div>
                            <span class="font-medium text-slate-700 dark:text-slate-200">Avoid ambiguous characters</span>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400">Excludes 0, O, 1, l, I</p>
                        </div>
                        <input type="checkbox" bind:checked={options.avoidAmbiguous} class="rounded text-indigo-600 focus:ring-indigo-500" />
                    </label>
                </div>
            {:else}
                <div class="mt-4 space-y-4">
                    <div>
                        <div class="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                            <label for="pw-words">Word count</label>
                            <span class="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {options.wordCount} words
                            </span>
                        </div>
                        <input
                            id="pw-words"
                            type="range"
                            min="3"
                            max="8"
                            bind:value={options.wordCount}
                            class="mt-2 w-full accent-indigo-600 cursor-pointer"
                        />
                    </div>

                    <div class="grid grid-cols-2 gap-2.5 text-xs">
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.capitalizeWords} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Capitalize words</span>
                        </label>
                        <label class="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <input type="checkbox" bind:checked={options.includeNumberInPassphrase} class="rounded text-indigo-600 focus:ring-indigo-500" />
                            <span class="font-medium text-slate-700 dark:text-slate-200">Include number</span>
                        </label>
                    </div>
                </div>
            {/if}

            <!-- Footer -->
            <div class="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
                <Dialog.Close
                    class="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    Close
                </Dialog.Close>
                <button
                    type="button"
                    onclick={handleUsePassword}
                    class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:tick-02" width="16" height="16" />
                    {onSelectPassword ? "Use Password" : "Copy & Close"}
                </button>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<script lang="ts">
    let { onUsePassword }: { onUsePassword: (password: string) => void } = $props();

    const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
    const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const NUMBERS = "0123456789";
    const SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?";

    let length = $state(16);
    let numberCount = $state(3);
    let specialCount = $state(3);
    let generatedPassword = $state("");

    let halfLength = $derived(Math.floor(length / 2));

    const strengthRules = {
        hasMinLength: /^.{8,}$/,
        hasUpperCase: /[A-Z]/,
        hasLowerCase: /[a-z]/,
        hasDigit: /\d/,
        hasSpecialChar: /[^a-zA-Z0-9]/,
        hasGoodLength: /^.{12,}$/,
        hasGreatLength: /^.{16,}$/,
    };

    let strengthScore = $derived.by(() => {
        if (!generatedPassword) return 0;
        let score = 0;
        for (const regex of Object.values(strengthRules)) {
            if (regex.test(generatedPassword)) score++;
        }
        return score;
    });

    let strengthClass = $derived.by(() => {
        if (strengthScore <= 2) return "progress-critical";
        if (strengthScore <= 4) return "progress-bad";
        return "progress-good";
    });

    let strengthValue = $derived(Math.min((strengthScore / 7) * 100, 100));

    $effect(() => {
        numberCount = Math.max(0, Math.min(numberCount, halfLength));
        specialCount = Math.max(0, Math.min(specialCount, halfLength));
    });

    function secureRandom(max: number): number {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0] % max;
    }

    function pickRandom(charset: string, count: number): string[] {
        const chars: string[] = [];
        for (let i = 0; i < count; i++) {
            chars.push(charset[secureRandom(charset.length)]);
        }
        return chars;
    }

    function fisherYatesShuffle(arr: string[]): string[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = secureRandom(i + 1);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function generate() {
        const effectiveNumbers = Math.min(numberCount, halfLength, length);
        const effectiveSpecial = Math.min(specialCount, halfLength, Math.max(0, length - effectiveNumbers));
        const letterCount = length - effectiveNumbers - effectiveSpecial;

        const chars: string[] = [
            ...pickRandom(NUMBERS, effectiveNumbers),
            ...pickRandom(SPECIAL, effectiveSpecial),
            ...pickRandom(LOWERCASE + UPPERCASE, letterCount),
        ];

        generatedPassword = fisherYatesShuffle(chars).join("");
    }

    function useGeneratedPassword() {
        if (!generatedPassword) {
            generate();
        }

        if (generatedPassword) {
            onUsePassword(generatedPassword);
        }
    }
</script>

<div class="generator-panel uk-margin-small">
    { /* @ts-ignore */ null }
    <div class="uk-grid-small uk-child-width-1-1" uk-grid>
        <div>
            <label class="uk-form-label uk-text-meta" for="pw-gen-length">
                Length: <strong>{length}</strong>
            </label>
            <input
                id="pw-gen-length"
                type="range"
                class="uk-range"
                min="8"
                max="64"
                bind:value={length}
            >
        </div>

        { /* @ts-ignore */ null }
        <div class="uk-grid-small" uk-grid>
            <div class="uk-width-1-2">
                <label class="uk-form-label uk-text-meta" for="pw-gen-numbers">Numbers</label>
                <input
                    id="pw-gen-numbers"
                    type="number"
                    class="uk-input uk-border-rounded uk-form-small"
                    min="0"
                    max={halfLength}
                    bind:value={numberCount}
                >
            </div>
            <div class="uk-width-1-2">
                <label class="uk-form-label uk-text-meta" for="pw-gen-special">Special chars</label>
                <input
                    id="pw-gen-special"
                    type="number"
                    class="uk-input uk-border-rounded uk-form-small"
                    min="0"
                    max={halfLength}
                    bind:value={specialCount}
                >
            </div>
        </div>

        {#if generatedPassword}
            <div>
                <input
                    type="text"
                    aria-label="generated-password-preview"
                    class="uk-input uk-border-rounded uk-form-small"
                    readonly
                    value={generatedPassword}
                >
            </div>
            <progress
                class="uk-progress uk-margin-remove-bottom {strengthClass}"
                value={strengthValue}
                max="100"
            ></progress>
        {/if}

        <div>
            <button
                type="button"
                class="uk-button uk-button-default uk-button-small uk-border-rounded uk-width-1-1"
                onclick={generate}
            >
                Generate password
            </button>
        </div>

        <div>
            <button
                type="button"
                class="uk-button uk-button-primary uk-button-small uk-border-rounded uk-width-1-1"
                onclick={useGeneratedPassword}
            >
                Use this password
            </button>
        </div>
    </div>
</div>

<style>
    .generator-panel {
        padding: 10px 12px;
        background: #f8f8f8;
        border-radius: 6px;
    }

    .uk-progress.progress-critical::-webkit-progress-value { background-color: #F44336; }
    .uk-progress.progress-critical::-moz-progress-bar { background-color: #F44336; }
    .uk-progress.progress-critical::-ms-fill { background-color: #F44336; }

    .uk-progress.progress-bad::-webkit-progress-value { background-color: #FF9800; }
    .uk-progress.progress-bad::-moz-progress-bar { background-color: #FF9800; }
    .uk-progress.progress-bad::-ms-fill { background-color: #FF9800; }

    .uk-progress.progress-good::-webkit-progress-value { background-color: #4CAF50; }
    .uk-progress.progress-good::-moz-progress-bar { background-color: #4CAF50; }
    .uk-progress.progress-good::-ms-fill { background-color: #4CAF50; }
</style>

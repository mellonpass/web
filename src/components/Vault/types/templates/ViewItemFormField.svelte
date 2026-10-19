<script lang="ts">
    import Icon from "@iconify/svelte";

    import CircularCountdownTimer from "$components/Vault/types/templates/fieldcontrols/CircularCountdownTimer.svelte";
    import PasswordToggle from "$components/Vault/types/templates/fieldcontrols/PasswordToggle.svelte";

    import {
        VaultDetailPasswordField,
        VaultDetailUrlField,
        type VaultDetailField,
    } from "$lib/models/data";
    import {
        evaluatePasswordStrength,
        tokenizeSecretForDisplay,
    } from "$lib/password-generator";

    let {
        field,
    }: {
        field: VaultDetailField;
    } = $props();

    let fieldProps = $state({
        field: field,
        displayValue: field.displayValue(),
    });

    let justCopied = $state(false);

    const isRevealedPassword = $derived(
        field.type === "password" &&
            (field as VaultDetailPasswordField).toggleState &&
            fieldProps.displayValue !== "••••••••••••"
    );

    const coloredTokens = $derived(
        isRevealedPassword
            ? tokenizeSecretForDisplay(String(fieldProps.displayValue ?? ""))
            : []
    );

    const passwordStrength = $derived(
        field.type === "password" && field.label.toLowerCase().includes("password")
            ? evaluatePasswordStrength(String(field.value ?? ""))
            : null
    );

    const formattedTotp = $derived.by(() => {
        if (field.type !== "otp") return "";
        const raw = String(fieldProps.displayValue ?? "");
        if (raw.length === 6) {
            return `${raw.slice(0, 3)} ${raw.slice(3)}`;
        }
        return raw;
    });

    const launchHref = $derived(
        field.type === "url" ? (field as VaultDetailUrlField).href : null
    );

    function handleCopy() {
        field.copyEvent();
        justCopied = true;
        setTimeout(() => {
            justCopied = false;
        }, 1600);
    }
</script>

<div class="flex items-center justify-between gap-4">
    <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {field.label}
            </span>
            {#if passwordStrength && passwordStrength.score > 0}
                <span
                    class="rounded-full px-2 py-0.2 text-[10px] font-semibold {passwordStrength.score <= 2
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}"
                >
                    {passwordStrength.label}
                </span>
            {/if}
        </div>

        <div class="mt-1 break-all">
            {#if field.type === "otp"}
                <span class="font-mono text-lg font-bold tracking-widest text-indigo-600 dark:text-indigo-400 select-all">
                    {formattedTotp}
                </span>
            {:else if isRevealedPassword}
                <span class="font-mono text-sm font-medium select-all">
                    {#each coloredTokens as token}
                        <span
                            class={token.type === "digit"
                                ? "text-sky-600 dark:text-sky-400"
                                : token.type === "symbol"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-900 dark:text-slate-100"}
                        >{token.char}</span>
                    {/each}
                </span>
            {:else if field.type === "password"}
                <span class="font-mono text-sm tracking-wider text-slate-500 dark:text-slate-400 select-none">
                    {fieldProps.displayValue}
                </span>
            {:else if field.type === "url" && launchHref}
                <a
                    href={launchHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                    {fieldProps.displayValue}
                </a>
            {:else}
                <span class="text-sm font-medium text-slate-900 dark:text-slate-100 select-all">
                    {fieldProps.displayValue}
                </span>
            {/if}
        </div>
    </div>

    <div class="flex shrink-0 items-center gap-1">
        {#if field.type === "password"}
            {#key fieldProps.displayValue}
                <PasswordToggle bind:fieldProps />
            {/key}
        {:else if field.type === "otp"}
            {#key fieldProps.displayValue}
                <CircularCountdownTimer bind:fieldProps />
            {/key}
        {:else if field.type === "url" && launchHref}
            <a
                href={launchHref}
                target="_blank"
                rel="noopener noreferrer"
                title="Open website in new tab"
                aria-label="Open website in new tab"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
            >
                <Icon icon="hugeicons:link-square-02" width="16" height="16" />
            </a>
        {/if}

        {#if fieldProps.displayValue != ""}
            <button
                type="button"
                aria-label="Copy {field.label}"
                title="Copy {field.label}"
                onclick={handleCopy}
                class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer {justCopied
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'}"
            >
                <Icon
                    icon={justCopied ? "hugeicons:tick-02" : "hugeicons:copy-01"}
                    width="16"
                    height="16"
                />
            </button>
        {/if}
    </div>
</div>

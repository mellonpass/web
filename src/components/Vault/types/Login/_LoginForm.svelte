<script lang="ts">
    import Icon from "@iconify/svelte";
    import PasswordGeneratorModal from "$components/ui/PasswordGeneratorModal.svelte";
    import {
        evaluatePasswordStrength,
        generateSecret,
    } from "$lib/password-generator";

    let { title = "Login Credentials", data = $bindable() } = $props();

    let togglePassword = $state(false);
    let toggleAuthKey = $state(false);
    let showGeneratorModal = $state(false);

    const strength = $derived(evaluatePasswordStrength(data.password));

    function quickGeneratePassword() {
        data.password = generateSecret();
        togglePassword = true;
    }
</script>

<div class="space-y-4">
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
    </h3>

    <!-- Username / Email -->
    <div>
        <label
            for="login-username"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Username or Email
        </label>
        <div class="relative mt-1.5">
            <Icon
                icon="hugeicons:user"
                width="16"
                height="16"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                id="login-username"
                type="text"
                aria-label="Username"
                placeholder="username or email@example.com"
                bind:value={data.username}
                class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>
    </div>

    <!-- Password + Inline Generator -->
    <div>
        <div class="flex items-center justify-between">
            <label
                for="login-password"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Password
            </label>
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={quickGeneratePassword}
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                    <Icon icon="hugeicons:magic-wand-01" width="13" height="13" />
                    <span>Quick Generate</span>
                </button>
                <span class="text-slate-300 dark:text-slate-700">•</span>
                <button
                    type="button"
                    onclick={() => (showGeneratorModal = true)}
                    class="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                    Customize...
                </button>
            </div>
        </div>

        <div class="relative mt-1.5">
            <Icon
                icon="hugeicons:lock-password"
                width="16"
                height="16"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                id="login-password"
                type={togglePassword ? "text" : "password"}
                aria-label="password"
                placeholder="Enter or generate a strong password"
                bind:value={data.password}
                class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-9 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
                type="button"
                aria-label="Toggle password visibility"
                onclick={() => (togglePassword = !togglePassword)}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
                <Icon
                    icon="hugeicons:{togglePassword ? 'view-off-slash' : 'view'}"
                    width="18"
                    height="18"
                />
            </button>
        </div>

        {#if data.password}
            <div class="mt-2 flex items-center justify-between gap-3">
                <div class="grid flex-1 grid-cols-4 gap-1">
                    {#each [1, 2, 3, 4] as step}
                        <div
                            class="h-1 rounded-full transition-colors {strength.score >= step
                                ? strength.colorClass.split(' ')[1]
                                : 'bg-slate-200 dark:bg-slate-800'}"
                        ></div>
                    {/each}
                </div>
                <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {strength.label} ({strength.entropyBits}b)
                </span>
            </div>
        {/if}
    </div>

    <!-- Website / URL -->
    <div>
        <label
            for="login-url"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Website URL <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <div class="relative mt-1.5">
            <Icon
                icon="hugeicons:globe-02"
                width="16"
                height="16"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                id="login-url"
                type="text"
                aria-label="Website URL"
                placeholder="https://example.com"
                bind:value={data.url}
                class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-9 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>
    </div>

    <!-- Authenticator Key (TOTP) -->
    <div>
        <label
            for="login-totp"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Authenticator Key (TOTP) <span class="font-normal text-slate-400">(optional)</span>
        </label>
        <div class="relative mt-1.5">
            <Icon
                icon="hugeicons:smart-phone-01"
                width="16"
                height="16"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                id="login-totp"
                type={toggleAuthKey ? "text" : "password"}
                aria-label="authenticator-key"
                placeholder="Base32 secret key (e.g., JBSWY3DPEHPK3PXP)"
                bind:value={data.authenticatorKey}
                class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-9 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
                type="button"
                aria-label="Toggle authenticator key visibility"
                onclick={() => (toggleAuthKey = !toggleAuthKey)}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
                <Icon
                    icon="hugeicons:{toggleAuthKey ? 'view-off-slash' : 'view'}"
                    width="18"
                    height="18"
                />
            </button>
        </div>
        <p class="mt-1 text-[11px] text-slate-400">
            Generates live 6-digit 2-step verification codes every 30 seconds.
        </p>
    </div>
</div>

<PasswordGeneratorModal
    bind:open={showGeneratorModal}
    onSelectPassword={(pw) => {
        data.password = pw;
        togglePassword = true;
    }}
/>

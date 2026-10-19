<script lang="ts">
    import { getContext, onMount } from "svelte";
    import Icon from "@iconify/svelte";
    import { extractSymmetricKey } from "$lib/key-generation";
    import { decryptCipherForVaultContent } from "$lib/symmetric-encryption";
    import { evaluatePasswordStrength } from "$lib/password-generator";
    import {
        allVaultItemsStore,
        categoryFilter,
        cipherStore,
        selectedVaultItem,
    } from "$lib/stores";
    import {
        CipherCategory,
        CipherType,
        VaultStatus,
        type CipherDatabaseData,
        type CipherLoginData,
    } from "$lib/types";
    import ItemAvatar from "$components/ui/ItemAvatar.svelte";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    interface AuditedItem {
        id: string;
        name: string;
        subtitle: string;
        type: CipherType;
        entropyBits: number;
        score: number;
        label: string;
        isWeak: boolean;
        isReused: boolean;
        missing2FA: boolean;
    }

    let loading = $state(true);
    let auditedItems: AuditedItem[] = $state([]);
    let filterTab: "all" | "weak" | "reused" | "no2fa" = $state("all");

    const weakItems = $derived(auditedItems.filter((i) => i.isWeak));
    const reusedItems = $derived(auditedItems.filter((i) => i.isReused));
    const no2faItems = $derived(auditedItems.filter((i) => i.missing2FA));

    const securityScore = $derived.by(() => {
        if (auditedItems.length === 0) return 100;
        let totalPoints = auditedItems.length * 100;
        for (const item of auditedItems) {
            if (item.isWeak) totalPoints -= 45;
            if (item.isReused) totalPoints -= 35;
            if (item.missing2FA) totalPoints -= 15;
        }
        return Math.max(0, Math.round(totalPoints / auditedItems.length));
    });

    const displayedItems = $derived.by(() => {
        if (filterTab === "weak") return weakItems;
        if (filterTab === "reused") return reusedItems;
        if (filterTab === "no2fa") return no2faItems;
        return auditedItems.filter((i) => i.isWeak || i.isReused || i.missing2FA);
    });

    function openItem(id: string) {
        const found = $allVaultItemsStore.find((item) => item.id === id);
        if (found) {
            $categoryFilter = CipherCategory.All;
            $selectedVaultItem = found;
        }
    }

    onMount(async () => {
        loading = true;
        try {
            const sk = await extractSymmetricKey(mk, epsk);
            const activeCiphers = $cipherStore.filter(
                (c) =>
                    c.type === CipherType.LOGIN || c.type === CipherType.DATABASE
            );

            const passwordCounts = new Map<string, number>();
            const tempDetails: Array<{
                id: string;
                name: string;
                subtitle: string;
                type: CipherType;
                password: string;
                hasTotp: boolean;
            }> = [];

            for (const c of activeCiphers) {
                const detail = await decryptCipherForVaultContent<any>(sk, c);
                if (detail.status !== VaultStatus.ACTIVE) continue;

                if (c.type === CipherType.LOGIN) {
                    const d = detail.data as CipherLoginData;
                    const pw = d.password || "";
                    if (pw) {
                        passwordCounts.set(pw, (passwordCounts.get(pw) || 0) + 1);
                    }
                    tempDetails.push({
                        id: detail.id,
                        name: detail.name,
                        subtitle: d.username || d.url || "Login",
                        type: CipherType.LOGIN,
                        password: pw,
                        hasTotp: Boolean(d.authenticatorKey && d.authenticatorKey.trim() !== ""),
                    });
                } else if (c.type === CipherType.DATABASE) {
                    const d = detail.data as CipherDatabaseData;
                    const pw = d.password || "";
                    if (pw) {
                        passwordCounts.set(pw, (passwordCounts.get(pw) || 0) + 1);
                    }
                    tempDetails.push({
                        id: detail.id,
                        name: detail.name,
                        subtitle: d.engine || "Database",
                        type: CipherType.DATABASE,
                        password: pw,
                        hasTotp: true,
                    });
                }
            }

            auditedItems = tempDetails.map((item) => {
                const report = evaluatePasswordStrength(item.password);
                return {
                    id: item.id,
                    name: item.name,
                    subtitle: item.subtitle,
                    type: item.type,
                    entropyBits: report.entropyBits,
                    score: report.score,
                    label: report.label,
                    isWeak: Boolean(item.password && report.score <= 2),
                    isReused: Boolean(item.password && (passwordCounts.get(item.password) || 0) > 1),
                    missing2FA: item.type === CipherType.LOGIN && !item.hasTotp,
                };
            });
        } finally {
            loading = false;
        }
    });
</script>

<div class="h-full overflow-y-auto p-6 lg:p-8 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div class="flex items-center gap-3.5">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20">
                <Icon icon="hugeicons:shield-01" width="26" height="26" />
            </div>
            <div>
                <h2 class="text-xl font-bold text-slate-900 dark:text-white">
                    Vault Watchtower
                </h2>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                    100% client-side zero-knowledge security audit of your credentials
                </p>
            </div>
        </div>

        <div class="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 shadow-2xs">
            <div class="text-right">
                <div class="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Vault Health
                </div>
                <div
                    class="text-lg font-bold font-mono {securityScore >= 80
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : securityScore >= 50
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'}"
                >
                    {securityScore}%
                </div>
            </div>
            <div
                class="flex h-10 w-10 items-center justify-center rounded-xl {securityScore >= 80
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : securityScore >= 50
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}"
            >
                <Icon
                    icon={securityScore >= 80 ? "hugeicons:checkmark-badge-02" : "hugeicons:alert-02"}
                    width="22"
                    height="22"
                />
            </div>
        </div>
    </div>

    <!-- Summary Metric Cards -->
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
            type="button"
            onclick={() => (filterTab = filterTab === "weak" ? "all" : "weak")}
            class="flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer {filterTab === 'weak'
                ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}"
        >
            <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Weak Passwords
                </p>
                <p class="mt-1 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {weakItems.length}
                </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Icon icon="hugeicons:alert-02" width="22" height="22" />
            </div>
        </button>

        <button
            type="button"
            onclick={() => (filterTab = filterTab === "reused" ? "all" : "reused")}
            class="flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer {filterTab === 'reused'
                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}"
        >
            <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Reused Passwords
                </p>
                <p class="mt-1 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {reusedItems.length}
                </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icon icon="hugeicons:repeat" width="22" height="22" />
            </div>
        </button>

        <button
            type="button"
            onclick={() => (filterTab = filterTab === "no2fa" ? "all" : "no2fa")}
            class="flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer {filterTab === 'no2fa'
                ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-500/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'}"
        >
            <div>
                <p class="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Inactive 2FA (TOTP)
                </p>
                <p class="mt-1 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {no2faItems.length}
                </p>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Icon icon="hugeicons:smart-phone-01" width="22" height="22" />
            </div>
        </button>
    </div>

    <!-- Findings List -->
    <div class="mt-6">
        {#if loading}
            <div class="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
                <Icon icon="hugeicons:loading-03" width="28" height="28" class="animate-spin text-indigo-500" />
                <p class="mt-3 text-sm font-medium">Auditing vault credentials locally...</p>
            </div>
        {:else if displayedItems.length === 0}
            <div class="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
                <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Icon icon="hugeicons:checkmark-badge-02" width="26" height="26" />
                </div>
                <h3 class="mt-3 text-base font-semibold text-slate-900 dark:text-white">
                    No security issues found
                </h3>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    All audited items in this category meet strong cryptographic hygiene.
                </p>
            </div>
        {:else}
            <div class="space-y-2.5">
                {#each displayedItems as item (item.id)}
                    <button
                        type="button"
                        onclick={() => openItem(item.id)}
                        class="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-left hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all cursor-pointer"
                    >
                        <div class="flex items-center gap-3.5 min-w-0">
                            <ItemAvatar type={item.type} name={item.name} subtitle={item.subtitle} />
                            <div class="min-w-0">
                                <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {item.name}
                                </div>
                                <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                    {item.subtitle}
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center justify-end gap-1.5">
                            {#if item.isWeak}
                                <span class="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                    Weak ({item.entropyBits}b)
                                </span>
                            {/if}
                            {#if item.isReused}
                                <span class="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    Reused
                                </span>
                            {/if}
                            {#if item.missing2FA}
                                <span class="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                                    No 2FA
                                </span>
                            {/if}
                            <Icon icon="hugeicons:arrow-right-01" width="16" height="16" class="text-slate-400 ml-1" />
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

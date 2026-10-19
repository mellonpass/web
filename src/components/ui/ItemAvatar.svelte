<script lang="ts">
    import Icon from "@iconify/svelte";
    import { CipherType } from "$lib/types";

    let {
        type,
        name = "",
        subtitle = "",
        size = "md",
        selected = false,
    }: {
        type: CipherType | string;
        name?: string;
        subtitle?: string;
        size?: "sm" | "md" | "lg";
        selected?: boolean;
    } = $props();

    const sizeClasses = {
        sm: "h-8 w-8 rounded-lg text-xs",
        md: "h-10 w-10 rounded-xl text-sm",
        lg: "h-12 w-12 rounded-2xl text-base",
    };

    const iconSizes = {
        sm: 16,
        md: 20,
        lg: 24,
    };

    const visual = $derived.by(() => {
        const lowerName = (name + " " + subtitle).toLowerCase();

        if (type === CipherType.CARD) {
            if (lowerName.includes("visa")) {
                return {
                    icon: "hugeicons:credit-card",
                    bg: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20",
                };
            }
            if (lowerName.includes("mastercard")) {
                return {
                    icon: "hugeicons:credit-card",
                    bg: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20",
                };
            }
            if (lowerName.includes("american express") || lowerName.includes("amex")) {
                return {
                    icon: "hugeicons:credit-card",
                    bg: "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border-sky-500/20",
                };
            }
            return {
                icon: "hugeicons:credit-card",
                bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
            };
        }

        if (type === CipherType.DATABASE) {
            if (lowerName.includes("postgres")) {
                return {
                    icon: "hugeicons:database",
                    bg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20",
                };
            }
            if (lowerName.includes("redis")) {
                return {
                    icon: "hugeicons:database",
                    bg: "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20",
                };
            }
            if (lowerName.includes("mongo")) {
                return {
                    icon: "hugeicons:database",
                    bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20",
                };
            }
            return {
                icon: "hugeicons:database",
                bg: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-500/20",
            };
        }

        if (type === CipherType.SECURE_NOTE) {
            return {
                icon: "hugeicons:notebook",
                bg: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20",
            };
        }

        // LOGIN items
        return {
            icon: "hugeicons:globe-02",
            bg: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-500/20",
        };
    });

    const initials = $derived.by(() => {
        const clean = name.trim();
        if (!clean) return "";
        const words = clean.split(/[\s\-_.]+/).filter(Boolean);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return clean.slice(0, 2).toUpperCase();
    });
</script>

<div
    class="flex shrink-0 items-center justify-center border font-semibold transition-colors {sizeClasses[size]} {selected
        ? 'bg-white/20 text-white border-white/30'
        : visual.bg}"
>
    {#if type === CipherType.LOGIN && initials && !["LO", "LI"].includes(initials)}
        <span class="tracking-tight">{initials}</span>
    {:else}
        <Icon icon={visual.icon} width={iconSizes[size]} height={iconSizes[size]} />
    {/if}
</div>

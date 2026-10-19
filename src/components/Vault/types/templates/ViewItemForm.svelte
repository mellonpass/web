<script lang="ts">
    import Icon from "@iconify/svelte";
    import { marked } from "marked";
    import DOMPurify from "dompurify";

    import ViewItemFormField from "$components/Vault/types/templates/ViewItemFormField.svelte";
    import ItemAvatar from "$components/ui/ItemAvatar.svelte";

    import type { VaultDetailField } from "$lib/models/data";
    import { CipherType, type FormItemDetails, type FormItemHistory } from "$lib/types";
    import { toast } from "$lib/toast.svelte";
    import type { Snippet } from "svelte";

    let {
        itemDetails,
        detailTitle,
        itemHistory,
        fields,
        itemType = CipherType.LOGIN,
        subtitle = "",
        beforeFields,
        heroBanner,
    }: {
        itemDetails: FormItemDetails;
        itemHistory: FormItemHistory;
        detailTitle?: string;
        fields?: Array<VaultDetailField>;
        itemType?: CipherType | string;
        subtitle?: string;
        beforeFields?: Snippet;
        heroBanner?: Snippet;
    } = $props();

    const hasFields = $derived(fields ? fields.length > 0 : false);

    const historyLastUpdated = $derived(
        `${itemHistory.lastEdited.toLocaleDateString()} at ${itemHistory.lastEdited.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );
    const historyCreated = $derived(
        `${itemHistory.created.toLocaleDateString()} at ${itemHistory.created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    );

    const sanitizedNotesHtml = $derived.by(() => {
        if (!itemDetails.notes) return "";
        const rawHtml = marked.parse(itemDetails.notes, { async: false }) as string;
        return DOMPurify.sanitize(rawHtml);
    });

    const copyNotes = () => {
        if (!itemDetails.notes) return;
        toast.copySecret(itemDetails.notes, "Notes", true);
    };
</script>

<div class="space-y-5">
    <!-- Header Card -->
    <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-5 shadow-2xs">
        <div class="flex items-center gap-4">
            <ItemAvatar
                type={itemType}
                name={itemDetails.name}
                {subtitle}
                size="lg"
            />
            <div class="min-w-0 flex-1">
                <h2 class="truncate text-lg font-bold text-slate-900 dark:text-white">
                    {itemDetails.name}
                </h2>
                {#if subtitle}
                    <p class="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {subtitle}
                    </p>
                {/if}
            </div>
        </div>
    </div>

    {#if heroBanner}
        {@render heroBanner()}
    {/if}

    {#if beforeFields}
        {@render beforeFields()}
    {/if}

    <!-- Dynamic Credentials Card -->
    {#if detailTitle}
        <div>
            <h3 class="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {detailTitle}
            </h3>
            <div class="divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 shadow-2xs">
                {#if fields && hasFields}
                    {#each fields as field (field.label)}
                        {#if field.value && !field.hidden}
                            <div class="px-5 py-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                                <ViewItemFormField {field} />
                            </div>
                        {/if}
                    {/each}
                {:else}
                    <div class="px-5 py-6 text-center text-xs text-slate-400">
                        No credential details stored.
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    <!-- Notes Card (Safe Markdown) -->
    {#if itemDetails.notes && itemDetails.notes.trim() !== ""}
        <div>
            <div class="mb-2 flex items-center justify-between px-1">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Secure Notes
                </h3>
                <button
                    type="button"
                    onclick={copyNotes}
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:copy-01" width="13" height="13" />
                    <span>Copy note</span>
                </button>
            </div>
            <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-5 shadow-2xs">
                <div class="mp-markdown text-slate-700 dark:text-slate-200">
                    {@html sanitizedNotesHtml}
                </div>
            </div>
        </div>
    {/if}

    <!-- Metadata / History Card -->
    <div class="rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-100/50 dark:bg-slate-900/40 px-5 py-3.5">
        <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-1.5">
                <Icon icon="hugeicons:clock-01" width="14" height="14" class="text-slate-400" />
                <span>Last modified: <strong class="font-medium text-slate-700 dark:text-slate-300">{historyLastUpdated}</strong></span>
            </div>
            <div>
                <span>Created: <strong class="font-medium text-slate-700 dark:text-slate-300">{historyCreated}</strong></span>
            </div>
        </div>
    </div>
</div>

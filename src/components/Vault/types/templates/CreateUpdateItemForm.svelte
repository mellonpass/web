<script lang="ts">
    import type { FormCallBack, FormItemDetails } from "$lib/types";
    import Icon from "@iconify/svelte";
    import { marked } from "marked";
    import DOMPurify from "dompurify";
    import { onMount } from "svelte";

    let nameRef: HTMLInputElement | null = $state(null);

    let {
        id,
        itemDetails = $bindable(),
        onsubmit,
        errors,
        children = null,
    }: {
        id: string;
        itemDetails: FormItemDetails;
        onsubmit: FormCallBack;
        errors: Array<string>;
        children?: any;
    } = $props();

    let invalidInput = $state(false);
    let previewNotes = $state(false);

    const sanitizedPreview = $derived.by(() => {
        if (!itemDetails.notes) return "<p class='text-slate-400 italic'>Nothing to preview.</p>";
        const raw = marked.parse(itemDetails.notes, { async: false }) as string;
        return DOMPurify.sanitize(raw);
    });

    const handleInput = () => {
        invalidInput = false;
    };

    const handleInvalid = (e: any) => {
        e.preventDefault();
        invalidInput = true;
        e.target.focus();
    };

    onMount(() => {
        if (nameRef) {
            nameRef.select();
        }
    });
</script>

<form {id} {onsubmit} class="space-y-5">
    <!-- Item Title Section -->
    <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <label
            for="{id}-item-name"
            class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
            Item Title
        </label>
        <div class="mt-2">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                id="{id}-item-name"
                type="text"
                aria-label="Item title"
                placeholder="e.g., GitHub Production, Chase Sapphire"
                bind:this={nameRef}
                bind:value={itemDetails.name}
                oninput={handleInput}
                oninvalid={handleInvalid}
                required
                autofocus
                class="w-full rounded-xl border bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 transition-colors focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 {invalidInput
                    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'}"
            />
            {#if invalidInput}
                <p class="mt-1.5 text-xs text-rose-500">
                    Item title is required.
                </p>
            {/if}
        </div>
    </div>

    <!-- Dynamic Type-Specific Fields -->
    {#if children}
        <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
            {@render children()}
        </div>
    {/if}

    <!-- Notes Section with Markdown Preview -->
    <div class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
        <div class="flex items-center justify-between">
            <label
                for="{id}-item-notes"
                class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
                Notes <span class="font-normal normal-case text-slate-400">(Markdown supported)</span>
            </label>
            <button
                type="button"
                onclick={() => (previewNotes = !previewNotes)}
                class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
            >
                <Icon
                    icon={previewNotes ? "hugeicons:pencil-edit-02" : "hugeicons:view"}
                    width="13"
                    height="13"
                />
                <span>{previewNotes ? "Edit Markdown" : "Preview"}</span>
            </button>
        </div>

        <div class="mt-2">
            {#if previewNotes}
                <div class="min-h-[6.5rem] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 p-3.5 mp-markdown text-slate-700 dark:text-slate-200">
                    {@html sanitizedPreview}
                </div>
            {:else}
                <textarea
                    id="{id}-item-notes"
                    rows="4"
                    placeholder="Add recovery codes, security questions, or Markdown notes..."
                    aria-label="notes"
                    bind:value={itemDetails.notes}
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                ></textarea>
            {/if}
        </div>
    </div>

    {#if errors && errors.length > 0}
        <div class="space-y-2">
            {#each errors as error}
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
                    <span>{error}</span>
                </div>
            {/each}
        </div>
    {/if}
</form>

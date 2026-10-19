<script lang="ts">
    import Icon from "@iconify/svelte";
    import { toast } from "$lib/toast.svelte";
</script>

<div
    class="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm w-full flex-col gap-2.5 px-4 sm:px-0"
    aria-live="polite"
>
    {#each toast.toasts as item (item.id)}
        <div
            class="pointer-events-auto relative overflow-hidden rounded-xl border bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40 transition-all duration-200 {item.variant === 'danger'
                ? 'border-rose-200 dark:border-rose-500/30'
                : item.variant === 'warning'
                  ? 'border-amber-200 dark:border-amber-500/30'
                  : 'border-slate-200/90 dark:border-slate-800'}"
        >
            <div class="flex items-start gap-3">
                <div
                    class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg {item.variant === 'danger'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                        : item.variant === 'warning'
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                          : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'}"
                >
                    <Icon
                        icon={item.isClipboard
                            ? "hugeicons:shield-key"
                            : item.variant === "danger"
                              ? "hugeicons:alert-02"
                              : "hugeicons:tick-02"}
                        width="16"
                        height="16"
                    />
                </div>

                <div class="min-w-0 flex-1">
                    <p class="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.title}
                    </p>
                    {#if item.description}
                        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.description}
                        </p>
                    {/if}

                    {#if item.isClipboard}
                        <div class="mt-2 flex items-center gap-2">
                            <button
                                type="button"
                                onclick={() => toast.clearClipboardNow(item.id)}
                                class="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                                Clear now
                            </button>
                            <button
                                type="button"
                                onclick={() => toast.keepInClipboard(item.id)}
                                class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                                Keep
                            </button>
                        </div>
                    {/if}
                </div>

                <button
                    type="button"
                    aria-label="Dismiss notification"
                    onclick={() => toast.dismiss(item.id)}
                    class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="14" height="14" />
                </button>
            </div>

            {#if item.isClipboard && item.remainingSeconds !== undefined}
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800">
                    <div
                        class="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                        style="width: {(item.remainingSeconds / 30) * 100}%;"
                    ></div>
                </div>
            {/if}
        </div>
    {/each}
</div>

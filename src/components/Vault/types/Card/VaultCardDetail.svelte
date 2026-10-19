<script lang="ts">
    import { getContext, onMount } from "svelte";
    import Icon from "@iconify/svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { VaultCardDetailComponentData } from "$lib/models/data";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";
    import { toast } from "$lib/toast.svelte";

    import { CipherType, type CipherCardData, type VaultItemDetail } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let { vaultId } = $props();

    let vaultItemDetail: VaultItemDetail<CipherCardData> | null = $state(null);
    let componentData: VaultCardDetailComponentData | null = $state(null);
    let revealCardPreview = $state(false);

    const cardGradient = $derived.by(() => {
        const brand = (vaultItemDetail?.data?.brand || "").toLowerCase();
        if (brand.includes("visa"))
            return "from-blue-700 via-indigo-700 to-slate-900";
        if (brand.includes("master"))
            return "from-orange-600 via-rose-600 to-slate-900";
        if (brand.includes("american") || brand.includes("amex"))
            return "from-cyan-700 via-sky-800 to-slate-900";
        return "from-slate-800 via-slate-900 to-slate-950";
    });

    const formattedCardNumber = $derived.by(() => {
        const raw = (vaultItemDetail?.data?.number || "").replace(/\s+/g, "");
        if (!raw) return "•••• •••• •••• ••••";
        if (revealCardPreview) {
            return raw.replace(/(.{4})/g, "$1 ").trim();
        }
        const last4 = raw.slice(-4);
        return `•••• •••• •••• ${last4}`;
    });

    onMount(async () => {
        const sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherCardData>(
            vaultId,
            sk
        );
        componentData = new VaultCardDetailComponentData(vaultItemDetail.data);
    });
</script>

{#if componentData && vaultItemDetail}
    <ViewItemForm
        itemType={CipherType.CARD}
        subtitle="{componentData.data.brand || 'Payment Card'} • {componentData.data.cardholderName || ''}"
        itemDetails={{
            name: vaultItemDetail.name,
            notes: vaultItemDetail.notes,
        }}
        itemHistory={{
            created: vaultItemDetail.created,
            lastEdited: vaultItemDetail.updated,
        }}
        detailTitle="{componentData.data.brand || 'Card'} Details"
        fields={componentData.fields}
    >
        {#snippet heroBanner()}
            {@const cardData = componentData?.data}
            {#if cardData}
                <div
                    class="relative overflow-hidden rounded-2xl bg-gradient-to-br {cardGradient} p-6 text-white shadow-lg"
                >
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <Icon icon="hugeicons:credit-card" width="22" height="22" class="opacity-85" />
                            <span class="text-xs font-bold uppercase tracking-widest opacity-90">
                                {cardData.brand || "Payment Card"}
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            {#if cardData.number}
                                <button
                                    type="button"
                                    onclick={() => (revealCardPreview = !revealCardPreview)}
                                    class="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                                >
                                    {revealCardPreview ? "Mask" : "Reveal"}
                                </button>
                                <button
                                    type="button"
                                    onclick={() =>
                                        toast.copySecret(
                                            cardData.number,
                                            "Card Number",
                                            true
                                        )}
                                    class="rounded-lg bg-white/15 hover:bg-white/25 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                                >
                                    Copy Number
                                </button>
                            {/if}
                        </div>
                    </div>

                    <div class="mt-6 font-mono text-xl sm:text-2xl font-bold tracking-widest select-all">
                        {formattedCardNumber}
                    </div>

                    <div class="mt-6 flex items-end justify-between text-xs">
                        <div>
                            <div class="text-[10px] uppercase tracking-wider text-white/60">
                                Cardholder
                            </div>
                            <div class="mt-0.5 font-semibold tracking-wide uppercase">
                                {cardData.cardholderName || "—"}
                            </div>
                        </div>
                        <div class="flex items-center gap-6">
                            {#if cardData.expMonth || cardData.expYear}
                                <div>
                                    <div class="text-[10px] uppercase tracking-wider text-white/60">
                                        Expires
                                    </div>
                                    <div class="mt-0.5 font-mono font-semibold">
                                        {cardData.expMonth || "__"}/{String(
                                            cardData.expYear || "__"
                                        ).slice(-2)}
                                    </div>
                                </div>
                            {/if}
                            {#if cardData.securityCode}
                                <button
                                    type="button"
                                    onclick={() =>
                                        toast.copySecret(
                                            cardData.securityCode,
                                            "Security Code (CVV)",
                                            true
                                        )}
                                    class="rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-left transition-colors cursor-pointer"
                                    title="Click to copy CVV"
                                >
                                    <div class="text-[9px] uppercase tracking-wider text-white/60">
                                        CVV
                                    </div>
                                    <div class="font-mono font-semibold">
                                        {revealCardPreview
                                            ? cardData.securityCode
                                            : "•••"}
                                    </div>
                                </button>
                            {/if}
                        </div>
                    </div>
                </div>
            {/if}
        {/snippet}
    </ViewItemForm>
{/if}

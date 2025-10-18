<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { VaultCardDetailComponentData } from "$lib/models/data";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";

    import type { CipherCardData, VaultItemDetail } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let { vaultId } = $props();

    let vaultItemDetail: VaultItemDetail<CipherCardData> | null = $state(null);
    let componentData: VaultCardDetailComponentData | null = $state(null)

    onMount(async () => {
        const sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherCardData>(vaultId, sk);
        componentData = new VaultCardDetailComponentData(vaultItemDetail.data);
    });

</script>

{#if componentData}
    <ViewItemForm 
        itemDetails={
            {"name": vaultItemDetail!.name, "notes": vaultItemDetail!.notes}
        }
        detailTitle="{componentData!.data.brand || 'Card'} details"
        fields={componentData!.getFields()} 
    />
{/if}

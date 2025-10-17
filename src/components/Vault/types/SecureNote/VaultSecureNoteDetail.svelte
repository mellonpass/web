<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";
    import type { CipherSecureNoteData, VaultItemDetail } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let { vaultId } = $props();

    let vaultItemDetail: VaultItemDetail<CipherSecureNoteData> | null = $state(null);

    onMount(async () => {
        const sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherSecureNoteData>(vaultId, sk);
    });
</script>

{#if vaultItemDetail}
    <ViewItemForm 
        itemDetails={
            {"name": vaultItemDetail.name, "notes": vaultItemDetail.notes}
        }
    />
{/if}

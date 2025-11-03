<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";
    import type { CipherSecuresNoteData, VaultItemDetail } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let { vaultId } = $props();

    let vaultItemDetail: VaultItemDetail<CipherSecuresNoteData> | null = $state(null);

    onMount(async () => {
        const sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherSecuresNoteData>(vaultId, sk);
    });
</script>

{#if vaultItemDetail}
    <ViewItemForm 
        itemDetails={
            {"name": vaultItemDetail.name, "notes": vaultItemDetail.notes}
        }
        itemHistory={
            {
                "created": vaultItemDetail.created,
                "lastEdited": vaultItemDetail.updated,
            }
        }
    />
{/if}

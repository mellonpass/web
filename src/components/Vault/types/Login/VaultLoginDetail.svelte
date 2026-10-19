<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { VaultLoginDetailComponentData } from "$lib/models/data";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";

    import { CipherType, type CipherLoginData, type VaultItemDetail } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let { vaultId } = $props();

    let vaultItemDetail: VaultItemDetail<CipherLoginData> | null = $state(null);
    let componentData: VaultLoginDetailComponentData | null = $state(null);

    onMount(async () => {
        const sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherLoginData>(
            vaultId,
            sk
        );
        componentData = new VaultLoginDetailComponentData(vaultItemDetail.data);
    });
</script>

{#if componentData && vaultItemDetail}
    <ViewItemForm
        itemType={CipherType.LOGIN}
        subtitle={vaultItemDetail.data.username || vaultItemDetail.data.url || "Login Item"}
        itemDetails={{
            name: vaultItemDetail.name,
            notes: vaultItemDetail.notes,
        }}
        itemHistory={{
            created: vaultItemDetail.created,
            lastEdited: vaultItemDetail.updated,
        }}
        detailTitle="Login Credentials"
        fields={componentData.fields}
    />
{/if}

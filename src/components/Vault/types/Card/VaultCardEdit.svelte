<script lang="ts">
    import { getContext, onMount } from "svelte";

    import CardForm from "$components/Vault/types/Card/_CardForm.svelte";
    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { updateCipher } from "$lib/services/ciphers";
    import { encryptVaultDetailForUpdate, handleCipherResponse, loadVaultItemDetailFromStore } from "$lib/vaults";

    import type { SymmetricKey } from "$lib/models/keys";
    import type { Cipher, CipherCardData, VaultItemDetail } from "$lib/types";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    const errors: Array<string> = [];

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherCardData> | null = $state(null);

    const onSave = async () => {
        errors.length = 0;

        const cipher: Cipher = await encryptVaultDetailForUpdate<CipherCardData>({
            vaultDetail: vaultItemDetail!,
            sk: sk!,
        });

        try {
            const response = await updateCipher(cipher);
            await handleCipherResponse(response.data.cipher.update, sk!);
            isEditMode = !isEditMode;
        } catch (error: any) {
            errors.push(error);
        }
    };

    onMount(async () => {
        sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherCardData>(vaultId, sk);
    });

</script>

{#if vaultItemDetail}
    <div class="uk-padding">
        <ItemForm
            id={formId}
            title="Card details"
            itemDetails={vaultItemDetail}
            onsubmit={onSave} 
            {errors}
        >
            <CardForm data={vaultItemDetail.data} />
        </ItemForm>
    </div>
{/if}

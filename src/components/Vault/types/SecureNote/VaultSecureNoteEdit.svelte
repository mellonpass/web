<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import type { SymmetricKey } from "$lib/models/keys";
    import { updateCipher } from "$lib/services/ciphers";
    import type { Cipher, CipherSecuresNoteData, VaultItemDetail } from "$lib/types";
    import { encryptVaultDetailForUpdate, handleCipherResponse, loadVaultItemDetailFromStore } from "$lib/vaults";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    const errors: Array<string> = [];

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherSecuresNoteData> | null = $state(null);

    const onSave = async () => {
        errors.length = 0;

        const cipher: Cipher = await encryptVaultDetailForUpdate<CipherSecuresNoteData>({
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
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherSecuresNoteData>(vaultId, sk);
    });

</script>

{#if vaultItemDetail}
    <div class="uk-padding">
        <ItemForm
            id={formId}
            title="Secure notes"
            itemDetails={vaultItemDetail}
            onsubmit={onSave} 
            {errors}
        >
        </ItemForm>
    </div>
{/if}

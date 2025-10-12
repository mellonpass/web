<script lang="ts">
    import { getContext, onMount } from "svelte";

    import LoginForm from "$components/Vault/types/Login/_LoginForm.svelte";
    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { updateCipher } from "$lib/services/ciphers";
    import { encryptVaultDetailForUpdate, handleCipherResponse, loadVaultItemDetailFromStore } from "$lib/vaults";

    import type { SymmetricKey } from "$lib/models/keys";
    import type { Cipher, CipherLoginData, VaultItemDetail } from "$lib/types";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    const errors: Array<string> = [];

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherLoginData> | null = $state(null);

    const onSave = async () => {
        errors.length = 0;

        const cipher: Cipher = await encryptVaultDetailForUpdate<CipherLoginData>({
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
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherLoginData>(vaultId, sk);
    });

</script>

{#if vaultItemDetail}
    <div class="uk-padding">
        <ItemForm
            id={formId}
            title="Login Credentials"
            itemDetails={vaultItemDetail}
            onsubmit={onSave} 
            {errors}
        >
            <LoginForm data={vaultItemDetail.data} />
        </ItemForm>
    </div>
{/if}

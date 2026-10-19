<script lang="ts">
    import { getContext, onMount } from "svelte";

    import LoginForm from "$components/Vault/types/Login/_LoginForm.svelte";
    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { updateCipher } from "$lib/services/ciphers";
    import {
        encryptVaultDetailForUpdate,
        handleCipherResponse,
        loadVaultItemDetailFromStore,
    } from "$lib/vaults";
    import { toast } from "$lib/toast.svelte";

    import type { SymmetricKey } from "$lib/models/keys";
    import type { Cipher, CipherLoginData, VaultItemDetail } from "$lib/types";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let errors: Array<string> = $state([]);

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherLoginData> | null = $state(null);

    const onSave = async (e: SubmitEvent) => {
        e.preventDefault();
        errors = [];

        const cipher: Cipher =
            await encryptVaultDetailForUpdate<CipherLoginData>({
                vaultDetail: vaultItemDetail!,
                sk: sk!,
            });

        try {
            const response = await updateCipher(cipher);
            await handleCipherResponse(response.data.cipher.update, sk!);
            toast.show({
                title: "Login updated",
                variant: "success",
            });
            isEditMode = false;
        } catch (error: any) {
            errors = [error?.message || String(error)];
        }
    };

    onMount(async () => {
        sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore<CipherLoginData>(
            vaultId,
            sk
        );
    });
</script>

{#if vaultItemDetail}
    <ItemForm
        id={formId}
        bind:itemDetails={vaultItemDetail}
        onsubmit={onSave}
        {errors}
    >
        <LoginForm title="Login Credentials" bind:data={vaultItemDetail.data} />
    </ItemForm>
{/if}

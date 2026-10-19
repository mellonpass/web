<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import type { SymmetricKey } from "$lib/models/keys";
    import { updateCipher } from "$lib/services/ciphers";
    import type {
        Cipher,
        CipherSecuresNoteData,
        VaultItemDetail,
    } from "$lib/types";
    import {
        encryptVaultDetailForUpdate,
        handleCipherResponse,
        loadVaultItemDetailFromStore,
    } from "$lib/vaults";
    import { toast } from "$lib/toast.svelte";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let errors: Array<string> = $state([]);

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherSecuresNoteData> | null =
        $state(null);

    const onSave = async (e: SubmitEvent) => {
        e.preventDefault();
        errors = [];

        const cipher: Cipher =
            await encryptVaultDetailForUpdate<CipherSecuresNoteData>({
                vaultDetail: vaultItemDetail!,
                sk: sk!,
            });

        try {
            const response = await updateCipher(cipher);
            await handleCipherResponse(response.data.cipher.update, sk!);
            toast.show({
                title: "Secure note updated",
                variant: "success",
            });
            isEditMode = false;
        } catch (error: any) {
            errors = [error?.message || String(error)];
        }
    };

    onMount(async () => {
        sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail =
            await loadVaultItemDetailFromStore<CipherSecuresNoteData>(
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
    />
{/if}

<script lang="ts">
    import { getContext, onMount } from "svelte";

    import DatabaseForm from "$components/Vault/types/Database/_DatabaseForm.svelte";
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
    import type {
        Cipher,
        CipherDatabaseData,
        VaultItemDetail,
    } from "$lib/types";

    let { formId, vaultId, isEditMode = $bindable() } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let errors: Array<string> = $state([]);

    let sk: SymmetricKey | null = $state(null);
    let vaultItemDetail: VaultItemDetail<CipherDatabaseData> | null =
        $state(null);

    const onSave = async (e: SubmitEvent) => {
        e.preventDefault();
        errors = [];

        const cipher: Cipher =
            await encryptVaultDetailForUpdate<CipherDatabaseData>({
                vaultDetail: vaultItemDetail!,
                sk: sk!,
            });

        try {
            const response = await updateCipher(cipher);
            await handleCipherResponse(response.data.cipher.update, sk!);
            toast.show({
                title: "Database credentials updated",
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
            await loadVaultItemDetailFromStore<CipherDatabaseData>(vaultId, sk);
    });
</script>

{#if vaultItemDetail}
    <ItemForm
        id={formId}
        bind:itemDetails={vaultItemDetail}
        onsubmit={onSave}
        {errors}
    >
        <DatabaseForm
            title="Database Credentials"
            bind:data={vaultItemDetail.data}
        />
    </ItemForm>
{/if}

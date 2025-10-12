<script lang="ts">
    import UIkit from "uikit";

    import { getContext } from "svelte";

    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";
    import CardForm from "$components/Vault/types/Card/_CardForm.svelte";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { createCipher } from "$lib/services/ciphers";
    import { cipherStore, newVaultItem } from "$lib/stores";
    import { encryptCipher } from "$lib/symmetric-encryption";
    import { CipherType, VaultStatus, type CipherCardData, type VaultItem } from "$lib/types";

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let itemDetails = {
        name: "Card",
    };
    let itemData: CipherCardData = {
        name: "",
        number: "",
        brand: "",
        expMonth: "",
        expYear: "",
        securityCode: "",
    };
    let errors: Array<string> = [];

    const onSubmit = async (e: any) => {
        e.preventDefault();

        if (!e.target.checkValidity()) {
            return;
        }

        const sk = await extractSymmetricKey(mk, epsk);
        const ck = await generateCipherKey();

        const cipher = await encryptCipher({
            sk: sk,
            ck: ck,
            name: itemDetails.name,
            type: CipherType.CARD,
            isFavorite: false,
            status: VaultStatus.ACTIVE,
            data: itemData
        });

        const response = await createCipher(cipher);

        // FIXME: refactor to be reusable.
        if (response.data.cipher.create.__typename == "Cipher") {
            const createdCipher = response.data.cipher.create;
            cipherStore.add(createdCipher);

            const newCardItem: VaultItem = {
                id: createdCipher.id,
                type: CipherType.CARD,
                name: itemDetails.name,
                content: itemData.brand || itemDetails.name,
                isFavorite: false,
                status: VaultStatus.ACTIVE
            }
            $newVaultItem = newCardItem;

            UIkit.modal("#vault-modal").hide();

            setTimeout(() => {
                e.target.reset();
                // Reset to default values.
                setTimeout(() => {
                    errors = [];
                    itemDetails.name = "Card";
                }, 500);
            });
        } else {
            errors.push(response.data.cipher.create.message);
        }
    };

</script>

<div class="uk-modal-body">
    <ItemForm
        id="cardForm"
        title="Card details"
        onsubmit={onSubmit}
        {itemDetails}
        {errors}
    >
        <CardForm data={itemData} />
    </ItemForm>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="cardForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

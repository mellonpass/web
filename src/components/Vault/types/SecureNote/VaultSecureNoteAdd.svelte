<script lang="ts">
    import UIkit from "uikit";

    import { getContext } from "svelte";

    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { newVaultItem } from "$lib/stores";
    import { CipherType } from "$lib/types";
    import { createVaultItem } from "$lib/vaults";

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let itemDetails = {
        name: "Notes",
        notes: "",
    };
    let errors: Array<string> = [];

    const onSubmit = async (e: any) => {
        e.preventDefault();

        if (!e.target.checkValidity()) {
            return;
        }

        try {
            $newVaultItem = await createVaultItem({
                mk:mk,
                epsk:epsk,
                name:itemDetails.name,
                notes:itemDetails.notes,
                content:"",
                cipherType:CipherType.SECURE_NOTE
            })

            UIkit.modal("#vault-modal").hide();

            setTimeout(() => {
                e.target.reset();
                // Reset to default values.
                setTimeout(() => {
                    errors = [];
                    itemDetails.name = "Notes";
                }, 500);
            });
        } catch (error) {
            errors = [(error as Error).message];
        }
    };

</script>

<div class="uk-modal-body">
    <ItemForm
        id="cardForm"
        title="Secure notes"
        onsubmit={onSubmit}
        {itemDetails}
        {errors}
    >
    </ItemForm>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="cardForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

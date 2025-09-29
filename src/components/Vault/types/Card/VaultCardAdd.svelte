<script lang="ts">
    import UIkit from "uikit";

    import { getContext } from "svelte";

    import AddItemForm from "$components/Vault/types/templates/AddItemForm.svelte";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { createCipher } from "$lib/services/ciphers";
    import { cipherStore, newVaultItem } from "$lib/stores";
    import { encryptCipher } from "$lib/symmetric-encryption";
    import { CipherType, VaultStatus, type CipherCardData, type VaultItem } from "$lib/types";
    import Icon from "@iconify/svelte";

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let toggleCardNumber = false;
    let toggleSecurityCode = false;

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
    <AddItemForm
        id="cardForm"
        title="Card details"
        {itemDetails}
        {onSubmit}
        {errors}
    >
        <div class="uk-margin-small uk-width-1-1">
            <input
                type="text"
                aria-label="cardholder-name"
                class="uk-input uk-border-rounded"
                placeholder="Cardholder name"
                bind:value={itemData.name}
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <div class="uk-inline uk-width-1-1">
                <a
                    class="uk-form-icon uk-form-icon-flip"
                    aria-label="card-number-toggle"
                    href={null}
                    onclick={() => toggleCardNumber = !toggleCardNumber}
                >
                    <Icon icon="hugeicons:{toggleCardNumber ? 'view-off-slash' : 'view'}" width="24" height="24" />
                </a>
                <input
                    type={toggleCardNumber ? "text" : "password"}
                    aria-label="card-number"
                    class="uk-input uk-border-rounded"
                    placeholder="Card number"
                    bind:value={itemData.number}
                >
            </div>
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <select
                class="uk-select uk-border-rounded"
                bind:value={itemData.brand}
            >
                <option value="">-- Select brand --</option>
                <option value="Visa">Visa</option>
                <option value="Mastercard">Mastercard</option>
                <option value="American Express">American Express</option>
                <option value="Discover">Discover</option>
                <option value="Diners Club">Diners Club</option>
                <option value="JBC">JBC</option>
                <option value="Maestro">Maestro</option>
                <option value="UnionPay">UnionPay</option>
                <option value="RuPay">RuPay</option>
                <option value="Other">Other</option>
            </select>
        </div>
        <div class="uk-margin-small uk-width-1-2">
            <select
                class="uk-select uk-border-rounded"
                bind:value={itemData.expMonth}
            >
                <option value="">-- Select month --</option>
                <option value="01">01 - January</option>
                <option value="02">02 - February</option>
                <option value="03">03 - March</option>
                <option value="04">04 - April</option>
                <option value="05">05 - May</option>
                <option value="06">06 - June</option>
                <option value="07">07 - July</option>
                <option value="08">08 - August</option>
                <option value="09">09 - September</option>
                <option value="10">10 - October</option>
                <option value="11">11 - November</option>
                <option value="12">12 - December</option>
            </select>
        </div>
        <div class="uk-margin-small uk-width-1-2">
            <input
                type="number"
                aria-label="card-exp-year"
                class="uk-input uk-border-rounded"
                placeholder="Expiration year"
                bind:value={itemData.expYear}
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <div class="uk-inline uk-width-1-1">
                <a
                    class="uk-form-icon uk-form-icon-flip"
                    aria-label="card-number-toggle"
                    href={null}
                    onclick={() => toggleSecurityCode = !toggleSecurityCode}
                >
                    <Icon icon="hugeicons:{toggleSecurityCode ? 'view-off-slash' : 'view'}" width="24" height="24" />
                </a>
                <input
                    type={toggleSecurityCode ? "text" : "password"}
                    aria-label="card-csv"
                    class="uk-input uk-border-rounded"
                    placeholder="Security code"
                    bind:value={itemData.securityCode}
                >
            </div>
        </div>
    </AddItemForm>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="cardForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

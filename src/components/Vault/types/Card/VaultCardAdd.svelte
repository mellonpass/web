<script lang="ts">
    import UIkit from "uikit";
    import AddItemForm from "$components/Vault/types/templates/AddItemForm.svelte";

    let itemDetails = {
        name: "",
    };
    let itemData = {
        type: "card",
        cardName: "",
        cardNumber: "",
        cardBrand: "",
        cardExpMonth: "",
        cardExpYear: "",
        cardSecurityCode: "",
    };
    let additionalOptions = {
        notes: ""
    };

    const onSubmit = (e: any) => {
        e.preventDefault();
        if (e.target.checkValidity()) {
            alert();
        }
    };

</script>

<div class="uk-modal-body">
    <AddItemForm
        id="cardForm"
        title="Card details"
        itemDetails={itemDetails}
        additionalOptions={additionalOptions}
        onSubmit={onSubmit}
    >
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="cardholder-name"
                class="uk-input uk-border-rounded"
                placeholder="Cardholder name"
                bind:value={itemData.cardName}
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="card-number"
                class="uk-input uk-border-rounded"
                placeholder="Card number"
                bind:value={itemData.cardNumber}
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <select
                class="uk-select uk-border-rounded"
                bind:value={itemData.cardBrand}
            >
                <option value="">-- Select brand --</option>
                <option value="mastercard">Mastercard</option>
                <option value="visa">Visa</option>
            </select>
        </div>
        <div class="uk-margin-small uk-width-1-2">
            <!-- svelte-ignore a11y_autofocus -->
            <select
                class="uk-select uk-border-rounded"
                bind:value={itemData.cardExpMonth}
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
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="number"
                aria-label="card-exp-year"
                class="uk-input uk-border-rounded"
                placeholder="Expiration year"
                bind:value={itemData.cardExpYear}
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="password"
                aria-label="card-csv"
                class="uk-input uk-border-rounded"
                placeholder="Security code"
                bind:value={itemData.cardSecurityCode}
            >
        </div>
    </AddItemForm>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="cardForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

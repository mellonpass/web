<script lang="ts">
    import UIkit from "uikit";
    import AddItemForm from "$components/Vault/types/templates/AddItemForm.svelte";
</script>

<div class="uk-modal-body">
    <AddItemForm title="Card details">
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="cardholder-name"
                class="uk-input uk-border-rounded"
                placeholder="Cardholder name"
                required
                autofocus
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="card-number"
                class="uk-input uk-border-rounded"
                placeholder="Card number"
                required
                autofocus
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <select class="uk-select uk-border-rounded">
                <option>-- Select brand --</option>
                <option>Mastercard</option>
                <option>Visa</option>
            </select>
        </div>
        <div class="uk-margin-small uk-width-1-2">
            <!-- svelte-ignore a11y_autofocus -->
            <select class="uk-select uk-border-rounded">
                <option>-- Select month --</option>
                <option>01 - January</option>
                <option>02 - February</option>
                <option>03 - March</option>
                <option>04 - April</option>
                <option>05 - May</option>
                <option>06 - June</option>
                <option>07 - July</option>
                <option>08 - August</option>
                <option>09 - September</option>
                <option>10 - October</option>
                <option>11 - November</option>
                <option>12 - December</option>
            </select>
        </div>
        <div class="uk-margin-small uk-width-1-2">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="number"
                aria-label="card-exp-year"
                class="uk-input uk-border-rounded"
                placeholder="Expiration year"
                min="2025"
                required
                autofocus
            >
        </div>
        <div class="uk-margin-small uk-width-1-1">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="password"
                aria-label="card-csv"
                class="uk-input uk-border-rounded"
                placeholder="Security code"
                required
                autofocus
            >
        </div>
    </AddItemForm>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="secureNoteForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

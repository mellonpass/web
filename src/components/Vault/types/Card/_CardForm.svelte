<script lang="ts">
    import Icon from "@iconify/svelte";

    let { data } = $props();

    let toggleCardNumber = $state(false);
    let toggleSecurityCode = $state(false);

</script>

<div class="uk-margin-small uk-width-1-1">
    <input
        type="text"
        aria-label="cardholder-name"
        class="uk-input uk-border-rounded"
        placeholder="Cardholder name"
        bind:value={data.name}
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
            bind:value={data.number}
        >
    </div>
</div>
<div class="uk-margin-small uk-width-1-1">
    <select
        class="uk-select uk-border-rounded"
        bind:value={data.brand}
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
        bind:value={data.expMonth}
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
        bind:value={data.expYear}
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
            bind:value={data.securityCode}
        >
    </div>
</div>
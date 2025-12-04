<script lang="ts">
    import Icon from "@iconify/svelte";

    import CircularCountdownTimer from "$components/Vault/types/templates/fieldcontrols/CircularCountdownTimer.svelte";
    import PasswordToggle from "$components/Vault/types/templates/fieldcontrols/PasswordToggle.svelte";

    import { type VaultDetailField } from "$lib/models/data";

    type FieldControl = {
        type: string;
        component: any;
        props?: Record<string, any>;
    };

    let {
        field,
     }: {
        field: VaultDetailField
    } = $props();

    let fieldProps = $state({
        "field": field,
        "displayValue": field.displayValue()
    });

    const predefinedControls: Array<FieldControl> = [
        {
            "type": "password",
            "component": PasswordToggle,
        },
        {
            "type": "otp",
            "component": CircularCountdownTimer,
        },
    ];
    // TODO: Allow mutliple controls per field.
    const fieldControl: FieldControl | undefined = predefinedControls.find(control => control.type === field.type);

</script>

<div class="uk-text-meta">{field.label}</div>
<div class="uk-flex uk-flex-between uk-flex-middle uk-margin-xsmall">
    <span>{fieldProps.displayValue}</span>
    <div class="uk-panel uk-flex uk-flex-middle">

        <!-- Re-render the control if its affect the displayValue. -->
        <!-- Render extra control based on field type. -->
        {#if fieldControl}
            {#key fieldProps.displayValue }
                <fieldControl.component bind:fieldProps={fieldProps}/>
            {/key}
        {/if}

        {#if fieldProps.displayValue != ""}
            { /* @ts-ignore */ null }
            <a
                href={null}
                aria-label="copy-icon"
                class="uk-icon-button form-field-icon-button"
                uk-tooltip="title: Copy"
                onclick={() => field.copyEvent()}
            >
                <Icon icon="hugeicons:copy-01"/>
            </a>
        {/if}
    </div>
</div>
<hr class="uk-margin-remove">

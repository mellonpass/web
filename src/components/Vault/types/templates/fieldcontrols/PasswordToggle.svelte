<script lang="ts">
    import Icon from "@iconify/svelte";
    
    import type { VaultDetailPasswordField } from "$lib/models/data";

    let { fieldProps = $bindable() } = $props();

    // To enable field typing.
    let _field: VaultDetailPasswordField = fieldProps.field as VaultDetailPasswordField;
    let togglePassword = $state(_field.toggleState);

</script>

{ /* @ts-ignore */ null }
<a
    href={null}
    aria-label="eye-icon"
    class="uk-icon-button form-field-icon-button"
    onclick={() => {
        togglePassword = _field.togglePassword();
        fieldProps.displayValue = _field.displayValue()
    }}
>
    <Icon icon="hugeicons:{togglePassword ? "view-off-slash" : "view"}"/>
</a>

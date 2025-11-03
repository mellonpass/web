<script lang="ts">
    import Icon from "@iconify/svelte";

    import type { VaultDetailField, VaultDetailPasswordField } from "$lib/models/data";

    let {
        field,
     }: {
        field: VaultDetailField
    } = $props();

    let tooglePassword = $state(
        field.type == "password" ? (field as VaultDetailPasswordField).tooglePassword : false
    );

    let displayValue = $derived.by(() => {
        if (field.type == "password") {
            (field as VaultDetailPasswordField).tooglePassword = tooglePassword;
        }
        return field.displayValue();
    });

</script>

<div class="uk-text-meta">{field.label}</div>
<div class="uk-flex uk-flex-between uk-flex-middle uk-margin-xsmall">
    <span>{displayValue}</span>
    <div class="uk-panel">
        {#if field.type == "password"}
            { /* @ts-ignore */ null }
            <a
                href={null}
                aria-label="eye-icon"
                class="uk-icon-button form-field-icon-button"
                onclick={() => tooglePassword = !tooglePassword}
            >
                <Icon icon="hugeicons:{tooglePassword ? "view-off-slash" : "view"}"/>
            </a>
        {/if}
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
    </div>
</div>
<hr class="uk-margin-remove">

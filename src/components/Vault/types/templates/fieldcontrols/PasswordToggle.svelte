<script lang="ts">
    import Icon from "@iconify/svelte";
    import type { VaultDetailPasswordField } from "$lib/models/data";

    let { fieldProps = $bindable() } = $props();

    let _field: VaultDetailPasswordField =
        fieldProps.field as VaultDetailPasswordField;
    let togglePassword = $state(_field.toggleState);
</script>

<button
    type="button"
    aria-label={togglePassword ? "Hide secret" : "Reveal secret"}
    title={togglePassword ? "Hide secret" : "Reveal secret"}
    onclick={() => {
        togglePassword = _field.togglePassword();
        fieldProps.displayValue = _field.displayValue();
    }}
    class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
>
    <Icon
        icon="hugeicons:{togglePassword ? 'view-off-slash' : 'view'}"
        width="16"
        height="16"
    />
</button>

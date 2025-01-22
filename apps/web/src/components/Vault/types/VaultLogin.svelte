<script>
    import VaultLoginDetail from "./VaultLoginDetail.svelte";
    import VaultLoginEdit from "./VaultLoginEdit.svelte";

    import IconButton from "$components/Buttons/IconButton.svelte";
    import { ciphers } from "$lib/mock/ciphers";

    let { vaultId, editMode } = $props();

    let cipher = {...ciphers.find(cipher => cipher.id == vaultId)};
    let output = $state(null);

    let ComponentDisplay = $derived(editMode ? VaultLoginEdit : VaultLoginDetail);

</script>

<div class="uk-width-expand">
    {#key editMode}
        <ComponentDisplay cipher={cipher}/>
    {/key}
</div>

<script>
    
    import { onMount } from "svelte";
    
    import VaultLogin from "./types/VaultLogin.svelte";
    import VaultSecureNote from "./types/VaultSecureNote.svelte";

    let {vaultItem = $bindable()} = $props();

    let VaultComponent = $state(null);

    const VAULT_MAPPER = {
        "LOGIN": VaultLogin,
        "SECURE_NOTE": VaultSecureNote
    }

    onMount(() => {
        if (vaultItem) {
            VaultComponent = VAULT_MAPPER[vaultItem.type];
        }
    });

</script>


<div class="uk-flex uk-flex-center uk-width-expand">
    <VaultComponent bind:data={vaultItem} />
</div>

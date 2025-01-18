<script>
    
    import { onMount } from "svelte";
    
    import VaultLogin from "./types/VaultLogin.svelte";
    import VaultSecureNote from "./types/VaultSecureNote.svelte";

    let {vaultItem = $bindable()} = $props();

    const VAULT_MAPPER = {
        "LOGIN": VaultLogin,
        "SECURE_NOTE": VaultSecureNote
    }

    let VaultComponent = $state(null);

    onMount(() => {
        VaultComponent = VAULT_MAPPER[vaultItem.type];
    });

</script>

<div>
    <VaultComponent />
</div>

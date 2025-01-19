<script>
    
    import { onMount } from "svelte";
    
    import VaultLogin from "./types/VaultLogin.svelte";
    import VaultSecureNote from "./types/VaultSecureNote.svelte";

    let { vaultData } = $props();

    let VaultComponent = $state(null);

    const VAULT_MAPPER = {
        "LOGIN": VaultLogin,
        "SECURE_NOTE": VaultSecureNote
    }

    onMount(() => {
        if (vaultData) {
            VaultComponent = VAULT_MAPPER[vaultData.type];
        }
    });

</script>


<div class="uk-flex uk-flex-center uk-width-expand">
    <VaultComponent vaultId={vaultData.id} />
</div>

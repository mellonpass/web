<script>
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
</script>


<div class="uk-height-viewport uk-flex">
    <div class="vault-side-nav uk-width-1-6">
        <VaultSideNav />
    </div>
    <div class="uk-width-expand">
        <VaultMain />
    </div>
</div>


<style>
    .vault-side-nav {
        background: #0D92F4;
    }

</style>

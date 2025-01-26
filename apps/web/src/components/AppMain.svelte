<script>
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
</script>


<div class="uk-flex" style="height: 100vh;">
    <div class="x-vault-side-nav">
        <VaultSideNav />
    </div>
    <div class="x-vault-main uk-width-expand">
        <VaultMain />
    </div>
</div>


<style>
    .x-vault-side-nav {
        width: 235px;
        height: 100%;
        overflow: scroll;
        background: #EEEEEE;
        border-right: 1px solid #E0E0E0;
    }

</style>

<script>
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import SideNav from "$components/SideNav.svelte";
</script>


<div class="uk-flex" style="height: 100vh;">
    <div class="x-vault-side-nav uk-width-1-6">
        <SideNav />
    </div>
    <div class="x-vault-main uk-width-expand">
        <VaultMain />
    </div>
</div>


<style>
    .x-vault-side-nav {
        background: #0D92F4;
    }

</style>

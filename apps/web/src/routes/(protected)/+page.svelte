<script>
    import ProfileNavbar from "$components/ProfileNavbar.svelte";
    import VaultList from "$components/VaultList.svelte";
</script>


<div class="uk-height-viewport uk-flex">
    <div class="vault-side-nav uk-width-1-6">
        <div></div>
    </div>
    <div class="vault-list uk-width-1-4">
        <VaultList />
    </div>
    <div class="uk-width-expand">
        <ProfileNavbar />
        <div class="vault-content uk-height-viewport">

        </div>
    </div>
</div>


<style>
    .vault-side-nav {
        background: #0D92F4;
    }

    .vault-list {
        border-color: #F5F5F5;
        border-right-style: solid;
    }

    .vault-content  {
        background-color: #F8FAFC;
    }
</style>

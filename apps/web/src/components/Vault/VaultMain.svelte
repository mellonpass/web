<script>
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    let search = $state(null);

    const vaultListItems = [
        {
            "title": "Gmail login",
            "content": "janedoe@gmail.com",
        },
        {
            "title": "Facebook login",
            "content": "johndoe@gmail.com",
        },
        {
            "title": "Youtube login",
            "content": "johndoe@gmail.com",
        },
    ];

    const filteredVaultListItem = $derived(
        vaultListItems.filter(
            item => search ? item.title.toLowerCase().includes(search) : true
        ).sort(
            (a, b) => a.title.localeCompare(b.title)
        )
    );

</script>


<div class="uk-flex uk-flex-column">
    <VaultNavbar bind:search={search} />
    <div uk-height-viewport="offset-top: true">
        <div class="uk-flex" uk-height-viewport>
            <div class="x-vault-list uk-width-1-4">
                <ul class="uk-list uk-margin-top">
                    {#each filteredVaultListItem as item}
                        <li class="x-uk-list-item">
                            <a href class="uk-link-reset">
                                <div class="uk-flex">
                                    <div class="uk-width-auto">
                                        <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                                    </div>
                                    <div class="uk-width-expand uk-margin-left">
                                        <div class="uk-text-default">{item.title}</div>
                                        <div class="uk-text-small uk-text-meta">{item.content}</div>
                                    </div>
                                </div>
                            </a>
                        </li>
                    {/each}
                </ul>
                <div class="uk-text-center">
                    <span class="uk-text-meta">{filteredVaultListItem.length} item{filteredVaultListItem.length > 1 ? "s" : "" }</span>
                </div>
            </div>
            <div class="x-vault-content uk-width-expand uk-padding-small">
                Content here
            </div>
        </div>
    </div>
</div>


<style>
    .x-uk-list-item {
        padding: 5px 15px;
    }

    .x-vault-content {
        background-color: #FBFBFB;
    }
</style>
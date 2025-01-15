<script>
    const vaultListItems = [
        {
            "title": "Gmail login",
            "content": "johndoe@gmail.com",
        },
        {
            "title": "Facebook login",
            "content": "johndoe@gmail.com",
        },
    ];

    let search = $state(null);
    let filteredVaultListItems = $derived(
        vaultListItems.filter(
            item => search ? item.title.toLowerCase().includes(search) : true
        ).sort(
            (a, b) => a.title.localeCompare(b.title)
        )
    )

</script>

<nav class="uk-flex uk-flex-middle vault-nav">
    <div class="uk-width-expand uk-padding-small">
        <div class="uk-inline uk-width-1-1">
            <span class="uk-form-icon" uk-icon="icon: search"></span>
            <input bind:value={search} name="search" class="uk-input uk-border-pill" type="text" placeholder="Search vault" aria-label="Input" autocomplete="off">
        </div>
    </div>
</nav>

<section>
    <div class="vault-list-info uk-text-center">
        <span class="uk-text-meta">{filteredVaultListItems.length} item{filteredVaultListItems.length > 1 ? "s" : "" } sorted by Title</span>
    </div>

    <div>
        <ul class="uk-list uk-list-striped">
            {#each filteredVaultListItems as item}
                <li>
                    <a href class="uk-link-reset">
                        <div class="uk-flex">
                            <div class="uk-width-auto">
                                <img alt="gravatar" class="uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                            </div>
                            <div class="uk-width-expand uk-margin-left">
                                <div class="uk-text-default">{item.title}</div>
                                <div class="uk-text-meta">{item.content}</div>
                            </div>
                        </div>
                    </a>
                </li>
            {/each}
        </ul>
    </div>
</section>

<style>
    .vault-nav {
        height: 70px;
        border-bottom: solid #F5F5F5;
    }

    .vault-list-info {
        border-bottom: solid #F5F5F5;
        padding: 5px;
    }
    
</style>
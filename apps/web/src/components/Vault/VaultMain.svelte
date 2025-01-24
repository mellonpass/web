<script>
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    import VaultContent from "$components/Vault/VaultContent.svelte";

    import { ciphers } from "$lib/mock/ciphers";
    import { onMount } from "svelte";

    let search = $state(null);
    let selectedItem = $state(null);

    const vaultListItems = JSON.parse(JSON.stringify(ciphers));
    const filteredVaultListItem = $derived(
        vaultListItems.filter(
            item => search ? item.title.toLowerCase().includes(search) : true
        ).sort(
            (a, b) => a.title.localeCompare(b.title)
        )
    );

    onMount(() => {
        selectedItem = filteredVaultListItem[0];
    });

    const onItemSelect = (item) => {
        vaultListItems.forEach(item => item.selected = false);
        item.selected = !item.selected;
        selectedItem = {
            id: item.id,
            type: item.type,
        }
    };

</script>


<div class="uk-flex uk-flex-column">
    <VaultNavbar bind:search={search} />
    <div uk-height-viewport="offset-top: true">
        <div class="uk-flex" uk-height-viewport>
            <div class="x-vault-list uk-width-1-4">
                <ul class="uk-list uk-margin-top">
                    {#each filteredVaultListItem as item (item.id)}
                        <li class:x-selected={item.selected} class="x-uk-list-item">
                            <a href class="uk-link-reset" onclick={() => {onItemSelect(item)}}>
                                <div class="uk-flex">
                                    <div class="uk-width-auto">
                                        <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                                    </div>
                                    <div class="uk-width-expand uk-margin-left">
                                        <div class="uk-text-default">{item.title}</div>
                                        <div class:uk-text-meta={!item.selected} class="uk-text-small">{item.content}</div>
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
            <div class="x-vault-content uk-width-expand">
                {#key selectedItem}
                    <VaultContent vaultData={selectedItem}/>
                {/key}
            </div>
        </div>
    </div>
</div>


<style>
    .x-uk-list-item {
        margin: 0;
        padding: 10px 15px;
    }

    .x-uk-list-item:hover {
        background: #FBFBFB;
    }

    .x-uk-list-item.x-selected {
        color: white;
        background: #142850;
    }

    .x-vault-content {
        background-color: #FBFBFB;
    }
</style>
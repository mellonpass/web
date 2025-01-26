<script>
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    import VaultContent from "$components/Vault/VaultContent.svelte";

    import { ciphers } from "$lib/mock/ciphers";
    import { onMount } from "svelte";

    let search = $state(null);
    let selectedItem = $state(null);

    // Copy ciphers array to create difference reference.
    let vaultListItems = $state(JSON.parse(JSON.stringify(ciphers)));
    const filteredVaultListItem = $derived.by(() => {
        const res = vaultListItems.filter(
            item => search ? item.name.toLowerCase().includes(search) : true
        ).sort(
            (a, b) => a.name.localeCompare(b.name)
        );
        return res;
    });

    onMount(() => {
        if (filteredVaultListItem.length != 0) {
            const firstItem = findVaultItem(filteredVaultListItem[0].id);
            firstItem.selected = true;
            selectedItem = {
                id: firstItem.id,
                type: firstItem.type,
            };
        }
    });

    const findVaultItem = (itemId) => {
        return vaultListItems.find(item => item.id == itemId);
    };

    const onItemSelect = (itemId) => {
        // Use the vaultListItems to modify it's content and not the 
        // derived filteredVaultListItem.
        vaultListItems.forEach(item => item.selected = false);
        const item = findVaultItem(itemId);
        item.selected = !item.selected;
        selectedItem = {
            id: item.id,
            type: item.type,
        }
    };

</script>


<div class="x-vault-main-container uk-flex uk-flex-column">
    <VaultNavbar bind:search={search} />

    <div class="uk-flex" uk-height-viewport="offset-top: true">
        <div class="x-vault-list">
            <ul class="uk-list uk-margin-top">
                {#each filteredVaultListItem as item (item.id)}
                    <li class:x-selected={item.selected} class="x-uk-list-item uk-border-rounded">
                        <a href class="uk-link-reset" onclick={() => {onItemSelect(item.id)}}>
                            <div class="uk-flex">
                                <div class="uk-width-auto">
                                    <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                                </div>
                                <div class="uk-width-expand uk-margin-left">
                                    <div class="uk-text-default">{item.name}</div>
                                    <div class:uk-text-meta={!item.selected} class="uk-text-small">{item.content.slice(0, 30)}</div>
                                </div>
                            </div>
                        </a>
                    </li>
                {/each}
            </ul>
            <div class="uk-text-center">
                {#if filteredVaultListItem.length > 0}
                    <span class="uk-text-meta">{filteredVaultListItem.length} item{filteredVaultListItem.length > 1 ? "s" : "" }</span>
                {:else}
                    <span class="uk-text-meta">No items to show.</span>    
                {/if}
            </div>
        </div>
        <div class="x-vault-content uk-width-expand">
            {#key selectedItem}
                <VaultContent vaultId={selectedItem?.id}/>
            {/key}
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
        background: #2962FF;
    }

    .x-vault-main-container {
        height: 100vh;
    }

    .x-vault-content {
        background-color: #FBFBFB;
        height: 100%;
        overflow: scroll;
    }

    .x-vault-list {
        padding: 0 10px;
        height: 100%;
        width: 275px;
        overflow: scroll;
        border-right: 1px solid #E0E0E0;
    }
</style>
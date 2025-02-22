<script lang="ts">
    import VaultContent from "$components/Vault/VaultContent.svelte";
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    import { vaultItemStore } from "$lib/stores";
    import { onDestroy, onMount } from "svelte";

    let search: string | null = $state(null);
    let selectedItem: { id: string; type: string; } | null = $state(null);

    // Copy ciphers array to create difference reference.
    const filteredVaultListItem = $derived.by(() => {
        if ($vaultItemStore.length == 0) { return [] }

        const res = $vaultItemStore.filter(
            item => search ? item.name.toLowerCase().includes(search) : true
        ).sort(
            (a, b) => a.name.localeCompare(b.name)
        );
        
        return res;
    });

    const selectItem = (itemId: string) => {
        // unselect vault items first.
        $vaultItemStore.forEach(item => item.selected = false);
        const item = $vaultItemStore.find(item => item.id == itemId);
        if (item) {
            item.selected = true;
            selectedItem = {
                id: item.id!,
                type: item.type,
            };
        }
    };

    const vaultItemStoreUnsubscriber = vaultItemStore.subscribe(vaultItems => {
        if (vaultItems.length > 0 && selectedItem) {
            // For new vault items, they're assigned as selected upon creation
            // but not selected yet on this component. Current selected item in
            // this component is assigned to the `selectedItem`.
            const selectedItems = $vaultItemStore.filter(item => item.selected);

            // If there are more than 1 items with selected=true, new vault items were added.
            // Pick the newly created vault item and select it on this component using
            // `selectItem` function.
            if (selectedItems.length > 1) {
                const newItem = selectedItems.find(item => item.id != selectedItem!.id);
                selectItem(newItem!.id);
            } else {
                selectItem(selectedItem!.id)
            }
        }
    });

    onMount(() => {
        setTimeout(() => {
            selectItem(filteredVaultListItem[0].id);
        }, 100);
    });

    onDestroy(() => {
        vaultItemStoreUnsubscriber();
    });

</script>

<div class="x-vault-main-container uk-flex uk-flex-column">
    <VaultNavbar bind:search={search} />
    { /* @ts-ignore */ null }
    <div class="uk-flex" uk-height-viewport="offset-top: true">
        <div class="x-vault-list">
            <ul class="uk-list uk-margin-top">
                {#each filteredVaultListItem as item (item.id)}
                    <li class:x-selected={item.selected} class="x-uk-list-item uk-border-rounded">
                        <a href={null} class="uk-link-reset" onclick={() => {selectItem(item.id)}}>
                            <div class="uk-flex">
                                <div class="uk-width-auto">
                                    <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                                </div>
                                <div class="uk-width-expand uk-margin-left">
                                    <div class="uk-text-default">{item.name}</div>
                                    <!-- TODO: simplify -->
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
        {#key selectedItem}
            <div class="x-vault-content uk-width-expand">
                <VaultContent vaultId={selectedItem?.id}/>
            </div>
        {/key}
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
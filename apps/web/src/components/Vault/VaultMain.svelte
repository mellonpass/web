<script lang="ts">
    import VaultContent from "$components/Vault/VaultContent.svelte";
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    import { searchFilter, selectedVaultItem, vaultItemStore } from "$lib/stores";
    import { type VaultItem } from "$lib/types";
    import { onDestroy } from "svelte";

    let vaultItems: Array<VaultItem> = $state([]);

    const selectItem = (vaultItem: VaultItem) => {
        if (vaultItem) {
            $selectedVaultItem = vaultItem;
        }
    };

    const searchFilterUnsubscribe = searchFilter.subscribe(value => {
        if (["", null].includes(value)) { 
            vaultItems = $vaultItemStore;
        } else {
            vaultItems = $vaultItemStore.filter(
                item => value ? item.name.toLowerCase().includes(value) : true
            )
        };

        if (vaultItems.length > 0) {
            selectItem(vaultItems[0]);
        }
    });

    const vaultItemStoreUnsubscribe = vaultItemStore.subscribe(items => {
        vaultItems = items.sort((a, b) => a.name.localeCompare(b.name));;

        // Remove selected vault item.
        if (vaultItems.length == 0) {
            $selectedVaultItem = null;
        } else {
            if ($selectedVaultItem != null) {
                setTimeout(() => {
                    const focusElement = document.getElementById($selectedVaultItem!.id);
                    focusElement?.scrollIntoView({behavior: "instant", block: "center"});
                }, 200);
            }
        }
    });

    onDestroy(() => {
        vaultItemStoreUnsubscribe();
        searchFilterUnsubscribe();
    });

</script>

<div class="x-vault-main-container uk-flex uk-flex-column">
    <VaultNavbar/>
        { /* @ts-ignore */ null }
        <div class="uk-flex" uk-height-viewport="offset-top: true">
            <div class="x-vault-list">
                <ul class="uk-list uk-margin-top">
                    {#each vaultItems as item (item.id)}
                        <li id={item.id} class:x-selected={item.id == $selectedVaultItem!.id} class="x-uk-list-item uk-border-rounded">
                            <a href={null} class="uk-link-reset" onclick={() => {selectItem(item)}}>
                                <div class="uk-flex">
                                    <div class="uk-width-auto">
                                        <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src="https://placehold.jp/150x150.png" width="40" height="40">
                                    </div>
                                    <div class="uk-width-expand uk-margin-left">
                                        <div class="uk-text-default">{item.name}</div>
                                        <!-- TODO: simplify -->
                                        <div class:uk-text-meta={item.id != $selectedVaultItem!.id} class="uk-text-small">{item.content.slice(0, 30)}</div>
                                    </div>
                                </div>
                            </a>
                        </li>
                    {/each}
                </ul>
                <div class="uk-padding-bottom-small uk-text-center">
                    {#if vaultItems.length > 0}
                        <span class="uk-text-meta">{vaultItems.length} item{vaultItems.length > 1 ? "s" : "" }</span>
                    {:else}
                        <span class="uk-text-meta">No items to show.</span>    
                    {/if}
                </div>
            </div>
            {#if $selectedVaultItem}
                {#key $selectedVaultItem}
                    <div class="x-vault-content uk-width-expand">
                        <VaultContent/>
                    </div>
                {/key}
            {/if}
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
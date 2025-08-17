<script lang="ts">
    import { PUBLIC_DEMO_MODE } from "$env/static/public";

    import { onDestroy, onMount } from "svelte";

    import VaultContent from "$components/Vault/VaultContent.svelte";
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";

    import vaultImage from "$lib/assets/images/vaultImage.png";
    import { searchFilter, selectedVaultItem, vaultItemStore } from "$lib/stores";
    import { type VaultItem } from "$lib/types";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";

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
            setTimeout(() => {
                if ($selectedVaultItem == null) { return; }
                const focusElement = document.getElementById($selectedVaultItem!.id);
                focusElement?.scrollIntoView({behavior: "instant", block: "center"});
            }, 200);
            
        }
    });

    onMount(() => {
        const max_idle_time = 10; // In minute.
        let idleTime: number = 0; // In minute.

        const incrementIdleTime = () => {
            idleTime++;
            if (idleTime > max_idle_time) {
                window.location.reload();
            }
        };

        function resetIdleTime() {
            idleTime = 0;
        }

        document.addEventListener('mousemove', resetIdleTime);
        document.addEventListener('keypress', resetIdleTime);

        const interval: number = setInterval(() => {
            incrementIdleTime();
        }, 60_000); // Increase per minute.

        return () => {
            clearInterval(interval);
            document.removeEventListener('mousemove', resetIdleTime);
            document.removeEventListener('keypress', resetIdleTime);
        };
    });

    onDestroy(() => {
        vaultItemStoreUnsubscribe();
        searchFilterUnsubscribe();
    });

</script>

<div class="uk-flex" style="height: 100%;">
    <div class="x-vault-side-nav">
        <VaultSideNav/>
    </div>
    <div class="x-vault-main-container uk-flex uk-flex-column uk-width-expand">
        {#if PUBLIC_DEMO_MODE === "true"}
            { /* @ts-ignore */ null }
            <div class="uk-alert-danger uk-text-center uk-margin-remove" uk-alert>
                { /* @ts-ignore */ null }
                <a href={null} class="uk-alert-close" aria-label="close-alert" uk-close></a>
                <p>
                    <strong>Warning</strong>: This is only a demo of MellonPass. Do not store real password data.
                </p>
            </div>
        {/if}
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
                                            <img alt="gravatar" class="uk-height-1-1 uk-object-cover uk-border-rounded" src={vaultImage} width="50" height="40">
                                        </div>
                                        <div class="uk-width-expand uk-margin-left">
                                            <div class="uk-text-default">{item.name}</div>
                                            <div class:uk-text-meta={item.id != $selectedVaultItem!.id} class="uk-text-small">{
                                                // If there is a new line (\n) show only the first line and limit to 20 chars.
                                                (item.content.indexOf("\n") >= 0 ? item.content.slice(0, item.content.indexOf("\n")) : item.content).slice(0, 20)
                                            }</div>
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

    .x-vault-side-nav {
        width: 235px;
        height: 100%;
        overflow: scroll;
        background: #EEEEEE;
        border-right: 1px solid #E0E0E0;
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
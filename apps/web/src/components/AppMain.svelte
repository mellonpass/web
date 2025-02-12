<script lang="ts">
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
    import { extractCipherKey, extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { CipherType, type CipherLoginData, type CipherSecureNoteData, type VaultItem } from "$lib/types";
    import { getContext, onMount, setContext } from "svelte";

    interface VaultData {
        id: string;
        type: CipherType;
        name: string;
        selected: boolean;
        content?: any;
    }

    if (localStorage.getItem("mk") != null) {
        setContext("mk", localStorage.getItem("mk"));
        // localStorage.removeItem("mk");
    }

    if (localStorage.getItem("epsk") != null) {
        setContext("epsk", localStorage.getItem("epsk"));
        // localStorage.removeItem("epsk");
    }

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let isUnlock = $state(false);
    let vaultItems: Array<VaultItem> = $state([]);

    onMount(async () => {

        isUnlock = epsk != null;
        if (!isUnlock) { return; }

        const ciphers = await getCiphers();
        if (ciphers.length <= 0) { return; }

        const sk = await extractSymmetricKey(mk, epsk);

        for (let cipher of ciphers) {
            const ck = await extractCipherKey(sk, cipher.key);

            const vaultData: VaultData = {
                id: cipher.id!,
                type: cipher.type,
                name: await ck.decryptText(cipher.name),
                selected: false,
            };

            switch (cipher.type) {
                case CipherType.LOGIN:
                    const loginData = cipher.data as CipherLoginData;
                    vaultData.content = await ck.decryptText(loginData.username);
                    break;
            
                default:
                    const secureNoteData = cipher.data as CipherSecureNoteData;
                    vaultData.content = await ck.decryptText(secureNoteData.note);
                    break;
            }
            vaultItems.push(vaultData as VaultItem);
        }
    });

</script>


<div class="uk-flex" style="height: 100vh;">
    {#if isUnlock}
        <div class="x-vault-side-nav">
            <VaultSideNav />
        </div>
        <div class="x-vault-main uk-width-expand">
            {#key vaultItems}
                <VaultMain bind:vaultListItems={vaultItems}/>
            {/key}
        </div>
    {:else}
        <VaultLock />
    {/if}
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

<script lang="ts">
    import UIkit from 'uikit';
    import gravatar from 'gravatar';

    import VaultLoginAdd from '$components/Vault/types/Login/VaultLoginAdd.svelte';
    import VaultSecureNoteAdd from '$components/Vault/types/SecureNote/VaultSecureNoteAdd.svelte';

    let { search = $bindable()} = $props();
    let selectedModal: string | null = $state(null);

    const ModalMapper: { [key: string]: any } = {
        "login": VaultLoginAdd,
        "secureNote": VaultSecureNoteAdd
    };

    const ModalComponent = $derived(ModalMapper[selectedModal!]);

    const whoami = JSON.parse(localStorage.getItem("whoami")!);
    let gravatar_url = gravatar.url(whoami.identity, {s: '100', r: 'pg', d: 'retro'});

</script>

<nav class="x-navbar uk-flex uk-padding-small">
    <div class="uk-width-expand x-vertical-center">
        <div class="uk-inline uk-width-1-1">
            { /* @ts-ignore */ null }
            <span class="uk-form-icon" uk-icon="icon: search"></span>
            <input name="search" bind:value={search} class="uk-input uk-form-small uk-border-pill" type="text" placeholder="Search vault" aria-label="Input" autocomplete="off" style="height: 35px;">
        </div>
    </div>
    <div class="uk-flex uk-flex-right">
        <div class="uk-inline x-vertical-center uk-margin-left">
            <button class="uk-button uk-button-primary uk-button-small uk-border-rounded uk-text-capitalize">New Item</button>
            { /* @ts-ignore */ null }
            <div id="new-item-dropdown" uk-dropdown="mode: click; pos: bottom-right;">
                <ul class="uk-nav uk-dropdown-nav">
                    <li class="uk-text-default">
                        { /* @ts-ignore */ null }
                        <a
                            href={null}
                            uk-toggle="target: #vault-modal"
                            onclick={() => {
                                selectedModal = "login";
                                UIkit.dropdown("#new-item-dropdown").hide();
                            }}>
                            { /* @ts-ignore */ null }
                            <span class="uk-margin-small-right" uk-icon="sign-in"></span>Login
                        </a>
                    </li>
                    <li class="uk-text-default">
                        { /* @ts-ignore */ null }
                        <a
                            href={null}
                            uk-toggle="target: #vault-modal"
                            onclick={() => {
                                selectedModal = "secureNote";
                                UIkit.dropdown("#new-item-dropdown").hide();
                            }}>
                            { /* @ts-ignore */ null }
                            <span class="uk-margin-small-right" uk-icon="file-text"></span>Secure note
                        </a>
                    </li>
                </ul>
            </div>
        </div>
        <div class="uk-inline x-vertical-center uk-margin-left">
            <div style="cursor: pointer;">
                <img alt="gravatar" class="uk-border-circle" src={gravatar_url} width="40" height="40">
            </div>
            { /* @ts-ignore */ null }
            <div uk-dropdown="mode: click; pos: bottom-right;">
                <ul class="uk-nav uk-dropdown-nav">
                    <li>
                        { /* @ts-ignore */ null }
                        <div class="uk-grid-small uk-flex-middle" uk-grid>
                            <div class="uk-width-auto">
                                <img alt="gravatar" class="uk-border-circle" src={gravatar_url} width="40" height="40">
                            </div>
                            <div class="uk-width-expand">
                                <span class="uk-text-default">Logged in as</span>
                                <span class="uk-text-light">{whoami.identity}</span>
                            </div>
                        </div>
                    </li>
                    <hr>
                    { /* @ts-ignore */ null }
                    <li class="uk-text-default"><a href={null}><span class="uk-margin-small-right" uk-icon="sign-out"></span>Logout</a></li>
                    { /* @ts-ignore */ null }
                    <li class="uk-text-default"><a href={null}><span class="uk-margin-small-right" uk-icon="lock"></span>Lock now</a></li>
                </ul>
            </div>
        </div>
    </div>
</nav>


<!-- This is the modal -->
{ /* @ts-ignore */ null }
<div id="vault-modal" uk-modal>
    <div class="uk-modal-dialog">
        <div class="uk-modal-header uk-flex">
            <h2 class="uk-modal-title uk-text-center uk-width-expand uk-margin-remove">New Item</h2>
            { /* @ts-ignore */ null }
            <button type="button" aria-label="close modal" onclick={() => {UIkit.modal("#vault-modal").hide()}} uk-close></button>
        </div>
        <ModalComponent />
    </div>
</div>

<style>
    .x-navbar {
        border-bottom: solid 1px #E0E0E0;
    }
</style>

<script lang="ts">
    import Icon from "@iconify/svelte";
    import UIkit from "uikit";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { createCipher } from "$lib/services/ciphers";
    import { cipherStore, newVaultItem } from "$lib/stores";
    import { encryptCipher } from "$lib/symmetric-encryption";
    import { CipherType, VaultStatus, type VaultItem } from "$lib/types";
    import { getContext, onMount } from "svelte";

    let passwordToggle = $state(false);
    let errorCreate = $state(false);
    let errorCreateMsg = $state(null);

    let loginNameRef: HTMLInputElement | null = $state(null);

    const cipherName = $state({
        name: "cipher-name",
        value: "Login name",
        invalid: null,
    });

    const cipherUsername = $state({
        name: "cipher-username",
        value: null,
        invalid: null,
    });

    const cipherPassword = $state({
        name: "cipher-password",
        value: null,
        invalid: null,
    });

    let formFields: { [key: string]: any } = {
        "cipher-name": cipherName,
        "cipher-username": cipherUsername,
        "cipher-password": cipherPassword,
    }

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let formSubmitted = $state(false);

    onMount(() => {
        if (loginNameRef) {
            loginNameRef.select();
        }
    });

    const onFieldFocusOut = (e: any) => {
        const field = formFields[e.target.name];
        field.invalid = !e.target.checkValidity();
    };

    const onFormSubmit = async (e: any) => {
        e.preventDefault();

        formSubmitted = true;

        for (const key of Object.keys(formFields)) {
            const el = e.target.elements[key];
            const field = formFields[key];
            field.invalid = !el.checkValidity();
        }

        if (e.target.checkValidity()) {
            const ck = await generateCipherKey();
            const sk = await extractSymmetricKey(mk, epsk);

            const cipher = await encryptCipher({
                sk: sk,
                ck: ck,
                name: cipherName.value,
                type: CipherType.LOGIN,
                isFavorite: false,
                status: VaultStatus.ACTIVE,
                data: {
                    username: cipherUsername.value!,
                    password: cipherPassword.value!
                }
            });

            const response = await createCipher(cipher);
            switch (response.data.cipher.create.__typename) {
                case "Cipher": {
                    const createdCipher = response.data.cipher.create;
                    cipherStore.add(createdCipher);

                    const newLoginItem: VaultItem = {
                        id: createdCipher.id,
                        type: CipherType.LOGIN,
                        name: cipherName.value,
                        content: cipherUsername.value!,
                        isFavorite: false,
                        status: VaultStatus.ACTIVE
                    }
                    $newVaultItem = newLoginItem;

                    UIkit.modal("#vault-modal").hide();

                    setTimeout(() => {
                        e.target.reset();
                        // Reset to default values.
                        setTimeout(() => {
                            errorCreate = false;
                            errorCreateMsg = null;
                            cipherName.value = "Login";
                        }, 500);
                    });

                    break;
                }
                default: {
                    errorCreateMsg = response.data.cipher.create.message;
                    errorCreate = true;
                    break;
                }
            }
        }
        formSubmitted = false;
    };

</script>

<div class="uk-modal-body">
    <form id="loginForm" class="uk-form-stacked" onsubmit={onFormSubmit} novalidate>
        <div class="uk-margin">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                bind:this={loginNameRef}
                bind:value={cipherName.value}
                onfocusout={onFieldFocusOut}
                name={cipherName.name}
                type="text"
                aria-label="Item title"
                class="uk-input uk-form-large uk-border-rounded"
                required
                autofocus
            >
            {#if cipherName.invalid}
                <div class="uk-margin-small uk-text-meta uk-text-danger">
                    This field is required.
                </div>
            {/if}
        </div>

        <div class="uk-margin">
            <label class="uk-form-label" for={cipherUsername.name}>Username</label>
            <div class="uk-form-controls">
                <input
                    bind:value={cipherUsername.value}
                    onfocusout={onFieldFocusOut}
                    name={cipherUsername.name}
                    id={cipherUsername.name}
                    type="text"
                    class="uk-input uk-border-rounded"
                    required
                >
            </div>
            {#if cipherUsername.invalid}
                <div class="uk-margin-small uk-text-meta uk-text-danger">
                    This field is required.
                </div>
            {/if}
        </div>
        <div class="uk-margin">
            <label class="uk-form-label" for={cipherPassword.name}>Password</label>
            <div class="uk-form-controls">
                <div class="uk-inline uk-width-100">
                    <input
                        bind:value={cipherPassword.value}
                        onfocusout={onFieldFocusOut}
                        name={cipherPassword.name}
                        id={cipherPassword.name}
                        class="uk-input uk-border-rounded"
                        type="{passwordToggle ? 'text' : 'password'}"
                        required
                    >
                    <a
                        aria-label="eye-icon"
                        class="uk-form-icon uk-form-icon-flip"
                        href={null}
                        onclick={() => {passwordToggle = !passwordToggle}}
                    >
                        <Icon icon="hugeicons:{passwordToggle ? 'view-off-slash' : 'view'}" width="24" height="24" />
                    </a>
                </div>
            </div>
            {#if cipherPassword.invalid}
                <div class="uk-margin-small uk-text-meta uk-text-danger">
                    This field is required.
                </div>
            {/if}
        </div>
    </form>
    {#if errorCreate}
        {/* @ts-ignore */ null}
        <div class="uk-alert-danger" uk-alert>
            <p>Error: {errorCreateMsg}</p>
        </div>
    {/if}
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button disabled={formSubmitted} form="loginForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

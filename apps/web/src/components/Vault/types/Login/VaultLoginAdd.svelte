<script lang="ts">
    import UIkit from "uikit";

    import { generateCipherKey, generateStretchedMasterKey } from "$lib/key-generation";
    import { hexToArrayBuffer } from "$lib/utils/bytes";
    import { getContext } from "svelte";
    import { Key, ProtectedSymmetricKey } from "$lib/models/keys";

    let passwordToggle = $state(false);
    
    const cipherName = $state({
        name: "cipher-name",
        value: "Login",
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

    const onFieldFocusOut = (e: any) => {
        const field = formFields[e.target.name];
        field.invalid = !e.target.checkValidity();
    };

    const onFormSubmit = async (e: any) => {
        e.preventDefault();

        for (const key of Object.keys(formFields)) {
            const el = e.target.elements[key];
            const field = formFields[key];
            field.invalid = !el.checkValidity();
        }

        if (e.target.checkValidity()) {
            const encoder = new TextEncoder();

            const smk = await generateStretchedMasterKey(hexToArrayBuffer(mk));

            const psk = await ProtectedSymmetricKey.fromBase64(epsk);
            const sk = await smk.extractKey(psk) as Key;

            const cipherKey = await generateCipherKey();
            const pck = await sk.protectKey(cipherKey);

            const data = {
                key: pck.toBase64(),
                name: await cipherKey.encrypt(encoder.encode(cipherName.value)),
                username: await cipherKey.encrypt(encoder.encode(cipherUsername.value!)),
                password: await cipherKey.encrypt(encoder.encode(cipherUsername.value!)),
            }

            // Store this in the database.
            console.log(data);
        }

    };

</script>

<div class="uk-modal-body">
    <form id="loginForm" class="uk-form-stacked" onsubmit={onFormSubmit} novalidate>
        <div class="uk-margin">
            <!-- svelte-ignore a11y_autofocus -->
            <input
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
                    { /* @ts-ignore */ null}
                    <a
                        aria-label="eye-icon"
                        class="uk-form-icon uk-form-icon-flip"
                        href={null}
                        uk-icon="icon: {passwordToggle ? 'eye-slash' : 'eye'}"
                        onclick={() => {passwordToggle = !passwordToggle}}
                    >
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
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button form="loginForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

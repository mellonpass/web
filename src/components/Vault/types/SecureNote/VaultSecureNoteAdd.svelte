<script lang="ts">
    import UIkit from "uikit";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { createCipher } from "$lib/services/ciphers";
    import { cipherStore, newVaultItem } from "$lib/stores";
    import { encryptCipher } from "$lib/symmetric-encryption";
    import { CipherType, VaultStatus, type Cipher, type VaultItem } from "$lib/types";
    import { getContext, onMount } from "svelte";

    let errorCreate = $state(false);
    let errorCreateMsg = $state(null);

    const cipherName = $state({
        name: "cipher-name",
        value: "Secure note name",
        invalid: null,
    });

    const cipherNote = $state({
        name: "cipher-note",
        value: null,
        invalid: null,
    });

    let formFields: { [key: string]: any } = {
        "cipher-name": cipherName,
        "cipher-note": cipherNote,
    }

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let secureNoteRef: HTMLInputElement | null = $state(null);

    let formSubmitted = $state(false);

    onMount(() => {
        if (secureNoteRef) {
            secureNoteRef.select();
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
                type: CipherType.SECURE_NOTE,
                name: cipherName.value,
                isFavorite: false,
                status: VaultStatus.ACTIVE,
                data: {
                    note: cipherNote.value!
                }
            });

            const response = await createCipher(cipher);
            switch (response.data.cipher.create.__typename) {
                case "Cipher": {
                    const createdCipher = response.data.cipher.create;
                    cipherStore.add(createdCipher as Cipher);

                    const newSecureNoteItem: VaultItem = {
                        id: createdCipher.id,
                        type: CipherType.SECURE_NOTE,
                        name: cipherName.value,
                        content: cipherNote.value!,
                        isFavorite: false,
                        status: VaultStatus.ACTIVE,
                    }

                    $newVaultItem = newSecureNoteItem;

                    UIkit.modal("#vault-modal").hide();

                    setTimeout(() => {
                        e.target.reset();
                        // Reset to default values.
                        setTimeout(() => {
                            errorCreate = false;
                            errorCreateMsg = null;
                            cipherName.value = "Secure note";
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
    <form id="secureNoteForm"  class="uk-form-stacked" onsubmit={onFormSubmit} novalidate>
        <div class="uk-margin">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                bind:this={secureNoteRef}
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
            <div class="uk-form-controls">
                <textarea
                    bind:value={cipherNote.value}
                    onfocusout={onFieldFocusOut}
                    name={cipherNote.name}
                    rows=10
                    style="resize: none;"
                    class="uk-textarea uk-border-rounded"
                    aria-label="Textarea"
                    required></textarea>
            </div>
            {#if cipherNote.invalid}
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
        <button form="secureNoteForm" type="submit" class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>

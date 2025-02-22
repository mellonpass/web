<script lang="ts">
    import UIkit from "uikit";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { getContext } from "svelte";
    import { createCipher } from "$lib/services/ciphers";
    import { CipherType, type Cipher } from "$lib/types";
    import { encryptCipher } from "$lib/symmetric-encryption";
    import { cipherStore, newVaultItemSignal } from "$lib/stores";

    let errorCreate = $state(false);
    let errorCreateMsg = $state(null);

    const cipherName = $state({
        name: "cipher-name",
        value: "Secure note",
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
            const ck = await generateCipherKey();
            const sk = await extractSymmetricKey(mk, epsk);

            const cipher = await encryptCipher({
                sk: sk,
                ck: ck,
                type: CipherType.SECURE_NOTE,
                name: cipherName.value,
                data: {
                    note: cipherNote.value!
                }
            });

            const response = await createCipher(cipher);
            switch (response.data.cipher.create.__typename) {
                case "Cipher": {
                    const createdCipher = response.data.cipher.create;
                    cipherStore.add(createdCipher as Cipher);

                    // Alert new vault item.
                    $newVaultItemSignal = {
                        id: createdCipher.id,
                        type: CipherType.LOGIN,
                        name: cipherName.value,
                        content: cipherNote.value!,
                        selected: true
                    };

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

    };

</script>

<div class="uk-modal-body">
    <form id="secureNoteForm"  class="uk-form-stacked" onsubmit={onFormSubmit} novalidate>
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

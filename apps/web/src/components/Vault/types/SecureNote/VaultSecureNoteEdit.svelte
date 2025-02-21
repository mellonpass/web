<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from 'svelte/store';

    let { cipher, data = $bindable({}) } = $props();

    let titleInputRef: HTMLInputElement;
    let textInputRef: HTMLTextAreaElement;

    const initData = writable({
        id: cipher.id,
        type: cipher.type,
        name: cipher.name,
        note: cipher.data.note,
    });

    const adjustTextAreaHeight = () => {
        textInputRef.style.height = "1px";
        textInputRef.style.height = `${textInputRef.scrollHeight}px`;
    };

    onMount(() => {
        titleInputRef.focus();
        titleInputRef.select();
        adjustTextAreaHeight();
    });

    // Capture initData changes and assign to
    // component data for saving.
    initData.subscribe((value) => {
        data = value;

        data.errors = [];
        if (value.name == "") {
            data.errors.push("Name is required.");
        }

        if (value.note == "") {
            data.errors.push("Note is required.");
        }

        if (textInputRef) {
            adjustTextAreaHeight();
        }
    });


</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        { /* @ts-ignore */ null}
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
            </div>
            <div class="uk-width-expand">
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    bind:this={titleInputRef}
                    bind:value={$initData.name}
                    style="background: none;"
                    class="uk-input uk-form-large x-editable-input"
                    type="text"
                    aria-label="Input"
                    autofocus
                >
            </div>
        </div>
    </div>

    <div class="x-panel uk-border-rounded">
        <textarea
            id="note"
            bind:this={textInputRef}
            bind:value={$initData.note}
            placeholder="This is the beginning of a note."
            class="uk-textarea uk-border-rounded uk-width-1-1 uk-padding-small">
        </textarea>
    </div>
</div>

<style>

    #note {
        resize: none;
    }

    .x-panel {
        height: auto;
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-editable-input {
        border: none;
    }
</style>
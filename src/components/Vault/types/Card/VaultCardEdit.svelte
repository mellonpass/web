<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from 'svelte/store';

    import vaultImage from "$lib/assets/images/vaultImage.png";

    let { cipher, data = $bindable({}) } = $props();

    const initData = writable({
        id: cipher.id,
        type: cipher.type,
        name: cipher.name,
        data: {
            note: cipher.data.note,
        }
    });

</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        { /* @ts-ignore */ null}
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
            </div>
            <div class="uk-width-expand">
               
            </div>
        </div>
    </div>

</div>

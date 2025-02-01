<script lang="ts">
    import { marked } from 'marked';

    let { cipher } = $props();
</script>

<div class="uk-padding-small">
    <div class="uk-grid-small uk-flex-middle" uk-grid>
        <div class="uk-width-auto">
            <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
        </div>
        <div class="uk-width-expand">
            <h3 class="uk-card-title uk-margin-remove-bottom">{cipher.name}</h3>
        </div>
    </div>
</div>

<div class="x-panel uk-border-rounded uk-padding-small">
    <div>
        {@html marked(cipher.data.note)}
    </div>
</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }
</style>
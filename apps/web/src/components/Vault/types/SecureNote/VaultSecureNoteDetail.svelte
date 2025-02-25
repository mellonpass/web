<script lang="ts">
    import vaultImage from "$lib/assets/vaultImage.png";

    let { cipher } = $props();
</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        { /* @ts-ignore */ null}
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
            </div>
            <div class="uk-width-expand">
                <h3 class="uk-card-title uk-margin-remove-bottom">{cipher.name}</h3>
            </div>
        </div>
    </div>

    <div class="x-panel uk-border-rounded uk-padding-small">
        <div>
            {cipher.data.note}
        </div>
    </div>
</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }
</style>
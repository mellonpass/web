<script>
    let {data = $bindable()} = $props();
</script>

<div class="uk-width-expand">
    <div class="uk-flex uk-flex-right">
        <button class="uk-button uk-button-small uk-button-primary uk-border-rounded">Edit</button>
    </div>
    <div class="uk-padding-small">
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
            </div>
            <div class="uk-width-expand">
                <h3 class="uk-card-title uk-margin-remove-bottom">{data.title}</h3>
            </div>
        </div>
    </div>
    <div class="x-login-panel uk-border-rounded">
        <div class="x-login-item uk-padding-small uk-flex">
            <span class="uk-text-muted uk-margin-right">Username: </span>
            <span class="uk-text-emphasis uk-text-baseline uk-width-expand">johndoe@gmail.com</span>
            <span class="x-copy-label uk-text-right">COPY</span>
        </div>
        <hr class="uk-margin-remove">
        <div class="x-login-item uk-padding-small uk-flex">
            <span class="uk-text-muted uk-margin-right">Password: </span>
            <span class="uk-text-emphasis uk-text-baseline uk-width-expand">• • • • • • • • • •</span>
            <span class="x-copy-label uk-text-right">COPY</span>
        </div>
    </div>
</div>


<style>
    .x-login-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-login-item:hover {
        cursor: pointer;
        background: #E3F2FD;
    }

    .x-copy-label {
        visibility: hidden;
    }

    .x-login-item:hover .x-copy-label {
        visibility: visible;
    }



</style>
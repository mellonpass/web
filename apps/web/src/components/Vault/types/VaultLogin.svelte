<script>
    import UIKit from 'uikit';


    let {data = $bindable()} = $props();

    const onCopy = () => {
        UIKit.notification({
            message: "<div class='x-vault-login-notification'>Copied to clipboard</div>",
            status: 'primary',
            pos: 'bottom-right',
            timeout: 100000,
        });
    };
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
        <a onclick={onCopy} href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
            <span class="uk-text-muted uk-margin-right">Username: </span>
            <span class="uk-text-emphasis uk-text-baseline uk-width-expand">johndoe@gmail.com</span>
            <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
        </a>
        <hr class="uk-margin-remove">
        <a onclick={onCopy} href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
            <span class="uk-text-muted uk-margin-right">Password: </span>
            <span class="uk-text-emphasis uk-text-baseline uk-width-expand">• • • • • • • • • •</span>
            <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
        </a>
    </div>
</div>


<style>
    .x-login-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-login-item:hover {
        cursor: pointer;
        font-weight: 500;
        background: #E3F2FD;
    }

    .x-copy-label {
        color: black;
        visibility: hidden;
    }

    .x-login-item:hover .x-copy-label {
        visibility: visible;
    }

    :global(.x-vault-login-notification) {
        color: white;
        background: #585858;
        font-size: small;
        font-weight: 500;
        padding: 10px;
        border-radius: 5px;
    }

</style>
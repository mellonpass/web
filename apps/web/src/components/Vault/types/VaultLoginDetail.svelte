<script>
    import UIKit from 'uikit';

    let { cipher } = $props();

    const onCopy = (data) => {
        navigator.clipboard.writeText(data).then(() => {
            UIKit.notification({
                message: `<div class='x-vault-login-notification'>Copied to clipboard.</div>`,
                status: 'primary',
                pos: 'bottom-right',
            });
        });
    };

</script>

<div class="uk-padding-small">
    <div class="uk-grid-small uk-flex-middle" uk-grid>
        <div class="uk-width-auto">
            <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
        </div>
        <div class="uk-width-expand">
            <h3 class="uk-card-title uk-margin-remove-bottom">{cipher.title}</h3>
        </div>
    </div>
</div>
<div class="x-login-panel uk-border-rounded">
    <a onclick={(e) => {onCopy(cipher.data.username)}} href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="uk-text-muted uk-margin-right">Username: </span>
        <span class="uk-text-emphasis uk-text-baseline uk-width-expand">{cipher.data.username}</span>
        <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
    </a>
    <hr class="uk-margin-remove">
    <a onclick={(e) => {onCopy(cipher.data.password)}} href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="uk-text-muted uk-margin-right">Password: </span>
        <span class="uk-text-emphasis uk-text-baseline uk-width-expand">• • • • • • • • • •</span>
        <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
    </a>
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

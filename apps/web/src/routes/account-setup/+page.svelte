<script>

</script>

<div class="uk-flex uk-flex-center">
    <section class="uk-width-1-3">
        <header class="uk-text-center">
            <h2>Account setup</h2>
        </header>

        <form class="uk-margin-medium" action="#" novalidate>
            <div>
                <div class="uk-margin-small">
                    <label for="master-password">Master password</label>
                </div>
                <input
                    class="uk-input"
                    type="password"
                    id="master-password"
                    name="master-password"
                    required
                >
                <p class="uk-text-meta uk-margin-remove-top">
                    <strong>Important:</strong> Your master password cannot be recovered if you forget it! 12 character minimum.
                </p>
    
                <progress class="uk-progress" value="75" max="100"></progress>
            </div>

            <div class="uk-margin">
                <div class="uk-margin-small">
                    <label for="confirm-password">Confirm master password</label>
                </div>
                <input
                    class="uk-input"
                    type="password"
                    id="confirm-password"
                    name="confirm-password"
                    required
                >

                <div class="uk-margin-small">
                    <label for="hint">Master password hint</label>
                </div>
                <input
                    class="uk-input"
                    type="text"
                    id="hint"
                    name="hint"
                    required
                >
                <p class="uk-text-meta uk-margin-remove-top">
                    If you forget your password, the password hint can be sent to your email. 0/50 character maximum.
                </p>
    
            </div>

            <div class="uk-margin">
                <button class="uk-button uk-button-primary uk-width-1-1">Create account</button>
            </div>
        </form>
    </section>
</div>

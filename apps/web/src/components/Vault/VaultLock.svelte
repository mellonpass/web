<script>
    import { generateLoginhash, generateMasterKey } from "$lib/crypto";
    import { unlock } from "$lib/services/accounts";

    let mPass = $state("");
    let toggleMpass = $state(false);
    let invalid = $state();
    let error = $state();
    let errorMsg = $state();

    const whoami = JSON.parse(localStorage.getItem("whoami"));

    const onSubmit = async () => {
        invalid = mPass == null || mPass.length == 0;

        if (!invalid) {
            error = false;

            const masterKey = await generateMasterKey(whoami.identity, mPass);
            const loginHash = await generateLoginhash(masterKey, mPass);

            try {
                const response = await unlock(loginHash);
                localStorage.setItem("psk", response.data.psk);
                window.location.assign('/');
            } catch (err) {
                error = true;
                errorMsg = err.error;
            }
        }
    };

</script>

<section class="uk-height-viewport uk-width-1-1">
    <header class="uk-container">
        <div class="uk-navbar-left">
            <a class="uk-navbar-item uk-logo" href="/" aria-label="Back to Home">MellonPass</a>
        </div>
    </header>

    <div class="uk-flex uk-flex-center uk-width-1-1">
        <div class="uk-width-1-3">
            <header class="uk-text-center">
                <h2>Your vault is locked.</h2>
                <p class="uk-text-large">
                    {whoami.identity}
                </p>
            </header>
            <form class="uk-margin-medium" onsubmit={onSubmit} novalidate>
                <div class="uk-margin">
                    <div class="uk-margin-small">
                        <label for="master-password">Master password</label>
                    </div>
    
                    <div class="uk-inline uk-width-1-1">
                        <input
                            bind:value={mPass}
                            class="uk-input uk-border-rounded"
                            type={toggleMpass ? "text": "password"}
                            autocomplete="off"
                            required
                        >
                        <a
                            href={null}
                            aria-label="eye-icon"
                            class="uk-form-icon uk-form-icon-flip"
                            uk-icon="icon: {toggleMpass ? "eye": "eye-slash"}"
                            onclick={() => { toggleMpass = !toggleMpass }}
                        >
                        </a>
                    </div>
                    {#if invalid}
                        <div class="uk-margin-small uk-text-meta uk-text-danger">
                            Master password is required.
                        </div>
                    {/if}
                    {#if error}
                        <div class="uk-margin-small uk-text-meta uk-text-danger">
                            {errorMsg}
                        </div>
                    {/if}
                </div>
    
                <div class="uk-margin">
                    <button class="uk-button uk-button-primary uk-border-rounded uk-width-1-1">Unlock</button>
                </div>

                <div class="uk-margin uk-text-center uk-text-default">
                    <p>or</p>
                </div>

                <div class="uk-margin">
                    <button class="uk-button uk-button-default uk-border-rounded uk-width-1-1">Logout</button>
                </div>

            </form>
        </div>
    </div>
</section>


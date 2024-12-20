<script>
    let matchedPasswords = $state(true);
    const invalidityMapper = $state({});

    const formFields = [
        {
            "id": "name",
            "label": "Name",
            "name": "name",
            "type": "text",
            "errorMsg": "Required field."
        },
        {
            "id": "email",
            "label": "Email",
            "name": "email",
            "type": "email",
            "errorMsg": "Invalid email."
        },
        {
            "id": "password",
            "label": "Password",
            "name": "password",
            "type": "password",
            "errorMsg": "Required field."
        },
        {
            "id": "confirm-password",
            "label": "Confirm password",
            "name": "confirm-password",
            "type": "password",
            "errorMsg": "Required field."
        },
    ];


    function matchPasswords(password1, password2) {
        return password1 === password2;
    }

    async function handleSignUpSubmit(e) {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);

        for (const [key, value] of data.entries()) {
            const element = form.elements[key]
            invalidityMapper[key] = !element.checkValidity();
        }

        if (Object.values(invalidityMapper).some(invalid => invalid)) {
            return;
        }

        matchedPasswords = matchPasswords(form.elements["password"].value, form.elements["confirm-password"].value);
    }

    async function handleInputFocusOut(e) {
        const element = e.currentTarget;
        invalidityMapper[element.name] = !element.checkValidity();
    }


</script>

<section class="uk-height-viewport">
    <header class="uk-container">
        <div class="uk-navbar-left">
            <a class="uk-navbar-item uk-logo" href="#" aria-label="Back to Home">MellonPass</a>
        </div>
    </header>
    <div class="uk-flex uk-flex-center">
        <section class="uk-width-1-3">
            <header>
                <h2 class="uk-text-center">Create account</h2>
            </header>

            <form id="signup-form" method="post" onsubmit={handleSignUpSubmit} novalidate>
                <div class="uk-margin">
                    {#each formFields as formField (formField.id)}
                        <div class="uk-margin-small-bottom">
                            <label for="{formField.name}">{formField.label}</label>
                        </div>
                        <input
                            onfocusout={handleInputFocusOut}
                            class:uk-form-danger={invalidityMapper[formField.name]}
                            class="uk-input"
                            type="{formField.type}"
                            id="{formField.id}"
                            name="{formField.name}"
                            required
                        >
                        {#if invalidityMapper[formField.name]}
                            <div class="uk-margin-small uk-text-default uk-text-danger">
                                {formField.errorMsg}
                            </div>
                        {/if}
                    {/each}

                    {#if !matchedPasswords}
                        <div class="uk-margin-small uk-text-default uk-text-danger">
                            Password mismatched!
                        </div>
                    {/if}
                    <div class="uk-margin">
                        <button class="uk-button uk-button-primary uk-width-1-1">Continue</button>
                    </div>
                </div>
            </form>
        
            <footer>
                <div>
                    By continuing, you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </div>
            </footer>
        </section>
    </div>
</section>
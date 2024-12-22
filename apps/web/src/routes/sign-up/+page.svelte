<script>
    import { checkEmailIfExists, createAccount } from '../../lib/accounts';

    let matchedPasswords = $state(true);
    let signUpSuccessful = $state(false);

    const serverErrors = $state([]);
    const invalidityMapper = $state({});
    const formFields = $state([
        {
            "id": "name",
            "label": "Name",
            "name": "name",
            "value": null,
            "type": "text",
            "errorMsg": "Required field.",
        },
        {
            "id": "email",
            "label": "Email",
            "name": "email",
            "value": null,
            "type": "email",
            "errorMsg": "Invalid email.",
        },
    ]);
    const emailField = $derived(formFields.find(field => field.id === "email"));
    const nameField = $derived(formFields.find(field => field.id === "name"));

    // checks if email is taken.
    const validateEmail = async () => {
        try {
            const emailResp = await checkEmailIfExists(emailField.value);
            invalidityMapper.email = !emailResp.data.is_valid;

            if (invalidityMapper.email) {
                emailField.errorMsg = "Email is already taken."
            }

            return !invalidityMapper.email;
        } catch (error) {
            serverErrors.length = 0;
            serverErrors.push({"message": error});
        }
    };

    // checks if name is non-whitespace.
    const validateName = () => {
        invalidityMapper.name = nameField.value.trim() === "";
        return !invalidityMapper.name;
    };

    const handleSignUpSubmit = async (e) => {
        e.preventDefault();

        const form = e.currentTarget;
        const data = new FormData(form);

        // check fields validity.
        for (const [key, value] of data.entries()) {
            const element = form.elements[key]
            invalidityMapper[key] = !element.checkValidity();
        }

        // if any of the fields are invalid, reject submit.
        if (Object.values(invalidityMapper).some(invalid => invalid)) {
            return;
        }

        // ensure that these fields validity check beyond required.
        if (validateName()) {
            try {
                await createAccount(nameField.value, emailField.value);
                signUpSuccessful = true;
            } catch (error) {
                serverErrors.length = 0;
                // if server returns a multiple error validation.
                if (typeof(error) === "object") {
                    Object.keys(error).forEach(key => {
                        const key_ = key.charAt(0).toUpperCase() + key.slice(1);
                        serverErrors.push({"message": `${key_}: ${error[key].join("; ")}`})
                    });
                } else {
                    serverErrors.push({"message": error})
                }
            }
        }
    }

    const handleInputFocusOut = async (e) => {
        const element = e.currentTarget;
        invalidityMapper[element.name] = !element.checkValidity();

        // Check if email is valid from the server.
        if (element.name === "email") {
            // if valid on the from end validate email from server.
            if (!invalidityMapper[element.name]) {
                validateEmail();
            } else {
                emailField.errorMsg = "Invalid email.";
            }
        }

        // Check if name is valid e.g. non-whitespace.
        if (element.name === "name" && !invalidityMapper[element.name]) {
            validateName();
        }
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
            {#if !signUpSuccessful}
                <header>
                    <h2 class="uk-text-center">Create account</h2>
                </header>


                {#each serverErrors as error (error)}
                    <div class="uk-alert-danger" uk-alert>
                        <a href class="uk-alert-close" uk-close></a>
                        <p>{error.message}</p>
                    </div>
                {/each}

                <form id="signup-form" method="post" onsubmit={handleSignUpSubmit} novalidate>
                    <div class="uk-margin">
                        {#each formFields as formField (formField.id)}
                            <div class="uk-margin-small">
                                <label for="{formField.name}">{formField.label}</label>
                            </div>
                            <input
                                onfocusout={handleInputFocusOut}
                                class:uk-form-danger={invalidityMapper[formField.name]}
                                class="uk-input"
                                bind:value={formField.value}
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

                        <div class="uk-margin">
                            <button class="uk-button uk-button-primary uk-width-1-1">Continue</button>
                        </div>
                    </div>
                </form>
                
                <p>
                    By continuing, you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </p>
            {:else}
                <header>
                    <h2 class="uk-text-center">Check your email</h2>
                </header>

                <div class="uk-card uk-card-medium uk-card-default uk-card-body">
                    <p class="uk-text-center">
                        Follow the link in the email sent to <strong>{emailField.value}</strong> and continue creating your account.
                    </p>
                </div>

                <p class="uk-text-center">
                    Already have an account? <a href="#">Log in</a>.
                </p>
            {/if}
        </section>
    </div>
</section>

<script>
    import { invalidateAll } from '$app/navigation';
    import { checkEmailIfExists, createAccount } from '../../lib/accounts';

    let matchedPasswords = $state(true);

    const serverErrors = $state([]);
    const invalidityMapper = $state({});
    const formFields = $state([
        {
            "id": "name",
            "label": "Name",
            "name": "name",
            "value": "",
            "type": "text",
            "errorMsg": "Required field.",
        },
        {
            "id": "email",
            "label": "Email",
            "name": "email",
            "value": "",
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
            invalidityMapper.name = !emailResp.data.is_valid;
            return !invalidityMapper.name;
        } catch (error) {
            serverErrors.push({"message": error, id: serverErrors.length})
            throw error;
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
                invalidateAll();
            } catch (error) {
                serverErrors.push({"message": error.message})
                throw error;
            }
        }
    }

    const handleInputFocusOut = async (e) => {
        const element = e.currentTarget;
        invalidityMapper[element.name] = !element.checkValidity();

        // Check if email is valid from the server.
        if (element.name === "email" && !invalidityMapper[element.name]) {
            // validateEmail();
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
        
            <footer>
                <div>
                    By continuing, you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
                </div>
            </footer>
        </section>
    </div>
</section>
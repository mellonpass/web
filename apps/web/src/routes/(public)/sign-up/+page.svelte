<script lang="ts">
    import { createAccount } from '$lib/services/accounts';

    type FormField = {
        id: string;
        label: string;
        name: string;
        value: string | null;
        type: string;
        errorMsg: string;
    }

    let signUpSuccessful = $state(false);

    const serverErrors: Array<{message: string}> = $state([]);
    const invalidityMapper: {[key: string]: any} = $state({});
    const formFields: Array<FormField> = $state([
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

    // checks if name is non-whitespace.
    const validateName = () => {
        invalidityMapper.name = nameField!.value?.trim() === "";
        return !invalidityMapper.name;
    };

    const handleSignUpSubmit = async (e: any) => {
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
                await createAccount(nameField!.value!, emailField!.value!);
                signUpSuccessful = true;
            } catch (error: any) {  // TODO: do something about error handling typing.
                const error_ = error.error;
                serverErrors.length = 0;
                // if server returns a multiple error validation.
                if (typeof(error_) === "object") {
                    Object.keys(error_).forEach(key => {
                        const key_ = key.charAt(0).toUpperCase() + key.slice(1);
                        serverErrors.push({"message": `${key_}: ${error_[key].join("; ")}`})
                    });
                } else {
                    serverErrors.push({"message": error_})
                }
            }
        }
    }

    const handleInputFocusOut = async (e: any) => {
        const element = e.currentTarget;

        if (element.name === "name") {
            // if valid, check if name is valid e.g. non-whitespace.
            if (element.checkValidity()) {
                // validate func provides showing of error.
                validateName();
                return;
            } else {
                emailField!.errorMsg = "Required field.";
            }
        }
        invalidityMapper[element.name] = !element.checkValidity();
    }
</script>

{#if !signUpSuccessful}
    <header>
        <h2 class="uk-text-center">Create account</h2>
    </header>

    {#each serverErrors as error (error)}
        {/* @ts-ignore */ null}
        <div class="uk-alert-danger" uk-alert>
            {/* @ts-ignore */ null}
            <a href={null} class="uk-alert-close" aria-label="alert-close" uk-close={true}></a>
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
        By continuing, you agree to the <a href={null}>Terms of Service</a> and <a href={null}>Privacy Policy</a>.
    </p>
{:else}
    <header>
        <h2 class="uk-text-center">Check your email</h2>
    </header>

    <div class="uk-card uk-card-medium uk-card-default uk-card-body">
        <p class="uk-text-center">
            Follow the link in the email sent to <strong>{emailField!.value}</strong> and continue creating your account.
        </p>
    </div>

    <p class="uk-text-center">
        Already have an account? <a href="/login">Log in</a>.
    </p>
{/if}

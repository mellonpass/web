<script lang="ts">
    import { page } from '$app/stores';

    import { generateLoginhash, generateMasterKey } from "$lib/crypto";
    import { loginAccount } from "$lib/services/accounts";
    import { arrayBufferToHex } from '$lib/utils/bytes';

    const emailInput = $state({
        name: "email",
        value: null,
        invalid: null
    });

    const masterPasswordInput = $state({
        name: "master-password",
        value: null,
        invalid: null,
        toggle: false,
    });

    let formFields = {
        "email": emailInput,
        "master-password": masterPasswordInput
    };

    const onFieldFocusOut = (e) => {
        const field = formFields[e.target.name];
        field.invalid = !e.target.checkValidity();
    };

    const onFormSubmit = async (e) => {
        e.preventDefault();

        for (const key of Object.keys(formFields)) {
            const el = e.target.elements[key];
            const field = formFields[key];
            field.invalid = !el.checkValidity();
        }

        if (e.target.checkValidity()) {
            const mk = await generateMasterKey(emailInput.value, masterPasswordInput.value);
            const loginHash = await generateLoginhash(mk, masterPasswordInput.value);
            const response = await loginAccount(emailInput.value, loginHash);

            localStorage.setItem("token", JSON.stringify(response.data.token));
            localStorage.setItem("mk", arrayBufferToHex(mk));
            localStorage.setItem("epsk", response.data.psk);

            window.location.assign($page.url.searchParams.get("next") ?? "/");
        }
    };

</script>


<header class="uk-text-center">
    <h2>Login</h2>
</header>

<form class="uk-margin-medium" onsubmit={onFormSubmit} novalidate>
    <div class="uk-margin">
        <div class="uk-margin-small">
            <label for="email">Email</label>
        </div>

        <div class="uk-inline uk-width-1-1">
            <input
                bind:value={emailInput.value}
                onfocusout={onFieldFocusOut}
                class:uk-form-danger={emailInput.invalid}
                class="uk-input"
                type={emailInput.name}
                id={emailInput.name}
                name={emailInput.name}
                autocomplete="email"
                required
            >
        </div>
        {#if emailInput.invalid}
            <div class="uk-margin-small uk-text-meta uk-text-danger">
                Invalid email.
            </div>
        {/if}
    </div>

    <div class="uk-margin">
        <div class="uk-margin-small">
            <label for="master-password">Master password</label>
        </div>

        <div class="uk-inline uk-width-100">
            <a
                aria-label="eye-icon"
                class="uk-form-icon uk-form-icon-flip"
                href={null}
                uk-icon="icon: {masterPasswordInput.toggle ? 'eye-slash' : 'eye'}"
                onclick={() => {masterPasswordInput.toggle = !masterPasswordInput.toggle}}
            >
            </a>
            <input
                bind:value={masterPasswordInput.value}
                onfocusout={onFieldFocusOut}
                type={masterPasswordInput.toggle ? "text" : "password"}
                class:uk-form-danger={masterPasswordInput.invalid}
                class="uk-input"
                id={masterPasswordInput.name}
                name={masterPasswordInput.name}
                autocomplete="off"
                required
            >
        </div>

        {#if masterPasswordInput.invalid}
            <div class="uk-margin-small uk-text-meta uk-text-danger">
                This field is required.
            </div>
        {/if}

    </div>

    <div class="uk-margin">
        <button class="uk-button uk-button-primary uk-width-1-1">Login</button>
    </div>
</form>

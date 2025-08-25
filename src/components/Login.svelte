<script lang="ts">
    import { PUBLIC_CF_ENABLE_TURNSTILE, PUBLIC_CF_TURNSTILE_SITE_KEY } from "$env/static/public";

    import Icon from "@iconify/svelte";
    
    import { page } from "$app/state";

    import Turnstile from "./Turnstile.svelte";

    import { generateLoginhash, generateMasterKey } from "$lib/key-generation";
    import { loginAccount } from "$lib/services/accounts";
    import { arrayBufferToHex } from "$lib/bytes";
    

    type FormField = {
        name: string;
        value: string | null;
        invalid: boolean | null;
        toggle?: boolean;
    };

    const emailInput: FormField = $state({
        name: "email",
        value: null,
        invalid: null
    });

    const masterPasswordInput: FormField = $state({
        name: "master-password",
        value: null,
        invalid: null,
        toggle: false,
    });

    let formFields: any = {
        "email": emailInput,
        "master-password": masterPasswordInput
    };

    let loginError = $state(null);
    let cfTurnsTileToken: string | undefined = $state();
    let formSubmitted = $state(false);

    // --
    // Events

    const onFieldFocusOut = (e: any) => {
        const field = formFields[e.target.name];
        field.invalid = !e.target.checkValidity();
    };

    const onFormSubmit = async (e: any) => {
        e.preventDefault();
        formSubmitted = true;
        for (const key of Object.keys(formFields)) {
            const el = e.target.elements[key];
            const field = formFields[key];
            field.invalid = !el.checkValidity();
        }

        if (e.target.checkValidity()) {
            const mk = await generateMasterKey(emailInput.value!, masterPasswordInput.value!);
            const loginHash = await generateLoginhash(mk, masterPasswordInput.value!);

            try {
                const response = await loginAccount(emailInput.value!, loginHash, cfTurnsTileToken);
                localStorage.setItem("mk", arrayBufferToHex(mk));
                localStorage.setItem("epsk", response.data.psk);
                window.location.assign(page.url.searchParams.get("next") ?? "/");
            } catch (error: any) {
                loginError = error.error
            }
        }
        formSubmitted = false;
    };

</script>

<header class="uk-text-center">
    <h2>Login</h2>
</header>

<form class="uk-margin-medium" onsubmit={onFormSubmit} novalidate>

    {#if loginError}
        { /* @ts-ignore */ null }
        <div class="uk-alert-danger" uk-alert>
            { /* @ts-ignore */ null }
            <a href={null} onclick={() => loginError = null} class="uk-alert-close" aria-label="close-alert" uk-close></a>
            <p>{loginError}</p>
        </div>
    {/if}

    <div class="uk-margin-small-top">
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
        <div class="uk-margin-small-top uk-text-meta uk-text-danger">
            {#if emailInput.invalid}
                Invalid email.
            {:else}
                &nbsp;
            {/if}
        </div>
    </div>

    <div class="uk-margin-small-top">
        <div class="uk-margin-small">
            <label for="master-password">Master password</label>
        </div>

        <div class="uk-inline uk-width-100">
            <a
                aria-label="eye-icon"
                class="uk-form-icon uk-form-icon-flip"
                href={null}
                onclick={() => {masterPasswordInput.toggle = !masterPasswordInput.toggle}}
            >
                <Icon icon="hugeicons:{masterPasswordInput.toggle ? "view-off-slash" : "view"}" width="24" height="24" />
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

        <div class="uk-margin-small-top uk-text-meta uk-text-danger">
            {#if masterPasswordInput.invalid}
                This field is required.
            {:else}
                &nbsp;
            {/if}
        </div>

    </div>

    {#if PUBLIC_CF_ENABLE_TURNSTILE === "true"}
        <Turnstile
            sitekey={PUBLIC_CF_TURNSTILE_SITE_KEY}
            action="login"
            callback={(cfToken) => {
                cfTurnsTileToken = cfToken;
            }}
        />
    {/if}

    <div class="uk-margin">
        <button disabled={formSubmitted || cfTurnsTileToken == null} class="uk-button uk-button-primary uk-width-1-1">Login</button>
    </div>

    <p class="uk-text-center">
        <a href="/sign-up">Create an account</a>
    </p>
</form>

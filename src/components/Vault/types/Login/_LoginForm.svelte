<script lang="ts">
    import Icon from "@iconify/svelte";
    import PasswordGenerator from "./_PasswordGenerator.svelte";

    let { title, data } = $props();

    let togglePassword = $state(false);
    let toggleAuthKey = $state(false);
    let showPasswordGenerator = $state(false);

    let passwordValue = $state(data.password || "");

    // Sync local state → prop when local changes
    $effect(() => {
        data.password = passwordValue;
    });

    const handleUseGeneratedPassword = (password: string) => {
        passwordValue = password;
        showPasswordGenerator = false;
    };

</script>

{ /* @ts-ignore */ null }
<fieldset class="uk-fieldset uk-margin" uk-grid>
    <legend class="uk-legend uk-text-default uk-text-bold">{ title }</legend>

    <div class="uk-margin-small uk-width-1-1">
        <input
            type="text"
            aria-label="Username"
            class="uk-input uk-border-rounded"
            placeholder="Username"
            bind:value={data.username}
        >
    </div>

    <div class="uk-margin-small uk-width-1-1">
        <div class="uk-inline uk-width-1-1">
            <a
                class="uk-form-icon uk-form-icon-flip password-generator-icon"
                aria-label="password-generator-toggle"
                href={null}
                onclick={() => showPasswordGenerator = !showPasswordGenerator}
            >
                <Icon icon="mdi:{showPasswordGenerator ? 'close' : 'autorenew'}" width="20" height="20" />
            </a>
            <a
                class="uk-form-icon uk-form-icon-flip"
                aria-label="password-toggle"
                href={null}
                onclick={() => togglePassword = !togglePassword}
            >
                <Icon icon="hugeicons:{togglePassword ? 'view-off-slash' : 'view'}" width="24" height="24" />
            </a>
            <input
                type={togglePassword ? "text" : "password"}
                aria-label="password"
                class="uk-input uk-border-rounded"
                placeholder="Password"
                bind:value={passwordValue}
            >
        </div>

        {#if showPasswordGenerator}
            <PasswordGenerator onUsePassword={handleUseGeneratedPassword} />
        {/if}
    </div>

    <div class="uk-margin-small uk-width-1-1">
        <div class="uk-inline uk-width-1-1">
            <a
                class="uk-form-icon uk-form-icon-flip"
                aria-label="authenticator-key-toggle"
                href={null}
                onclick={() => toggleAuthKey = !toggleAuthKey}
            >
                <Icon icon="hugeicons:{toggleAuthKey ? 'view-off-slash' : 'view'}" width="24" height="24" />
            </a>
            <input
                type={toggleAuthKey ? "text" : "password"}
                aria-label="authenticator-key"
                class="uk-input uk-border-rounded"
                placeholder="Authenticator key"
                bind:value={data.authenticatorKey}
            >
        </div>
        <span class="uk-text-meta uk-text-light">Fill 2-steps verification codes.</span>
    </div>

</fieldset>

<style>
    .password-generator-icon {
        right: 2.5rem;
    }
</style>

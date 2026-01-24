<script lang="ts">
    import Icon from "@iconify/svelte";

    let { title, data } = $props();

    let togglePassword = $state(false);
    let toggleAuthKey = $state(false);

    // TODO: Use data.websites. It must be available in the cipher data types or interfaces.
    const websiteURIs = $state<Record<string, string | number>[]>([]);

    const addWebsite = () => {
        const newIndex = websiteURIs.length + 1;
        websiteURIs.push({ uri: "", index: newIndex });
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
                bind:value={data.password}
            >
        </div>
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

{ /* @ts-ignore */ null }
<fieldset class="uk-fieldset uk-margin" uk-grid>
    <legend class="uk-legend uk-text-default uk-text-bold">Autofill options</legend>

    {#each websiteURIs as website (website.index)}
        <div class="uk-margin-small uk-width-1-1">
            <div class="uk-inline uk-width-1-1">
                <a
                    class="uk-form-icon uk-form-icon-flip"
                    aria-label="authenticator-key-toggle"
                    href={null}
                    onclick={() => websiteURIs.splice(websiteURIs.indexOf(website), 1)}
                >
                    <Icon icon="hugeicons:delete-02" width="16" height="16" style="color: #FF1744;" />
                </a>
                <input
                    type="text"
                    aria-label="website-uri"
                    class="uk-input uk-border-rounded"
                    placeholder="Website URI"
                    bind:value={website.uri}
                >
            </div>
        </div>
    {/each}

    <div class="uk-margin-small uk-width-1-1">
        <div class="uk-inline uk-width-1-1">
            <a
                class="uk-inline"
                aria-label="add-website-button"
                href={null}
                onclick={addWebsite}
            >
                <Icon icon="hugeicons:add-01" width="24" height="24" /> Add website
            </a>   
        </div>  
    </div>
</fieldset>

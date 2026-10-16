<script lang="ts">
    import { untrack } from "svelte";
    import type { CipherDatabaseData } from "$lib/types";
    import { ENGINE_SCHEMES, paramsToUrl, urlToParams } from "$lib/utils/database";

    let { title = "Database Credentials", data = $bindable() }: { title?: string, data: CipherDatabaseData } = $props();

    const ENGINES = Object.keys(ENGINE_SCHEMES);

    // Own the mode in local reactive state — the parent's `data` is a plain `let`
    // (not $state), so direct property mutations on it won't trigger re-renders.
    let connectionType = $state(data.connectionType ?? "URL");
    let mounted = false;

    // Handle connection type switch (conversion)
    $effect(() => {
        const mode = connectionType; // only reactive dependency — reads of `data` must NOT be tracked
        untrack(() => {
            data.connectionType = mode;

            // On mount, just sync the mode; don't convert because the fields already
            // hold the correct values from the saved/initial data.
            if (mounted) {
                if (mode === "URL") {
                    // Converting individual parameters → URL
                    data.url = paramsToUrl(data);
                    data.host = "";
                    data.port = "";
                    data.database = "";
                    data.username = "";
                    data.password = "";
                } else {
                    // Converting URL → individual parameters
                    const params = urlToParams(data.url ?? "");
                    if (params.engine) {
                        data.engine = params.engine;
                    }
                    data.host = params.host;
                    data.port = params.port;
                    data.database = params.database;
                    data.username = params.username;
                    data.password = params.password;
                    data.url = "";
                }
            }
            mounted = true;
        });
    });

    // Handle engine change while in URL mode (prefix sync)
    $effect(() => {
        const engine = data.engine;
        if (connectionType === "URL" && mounted) {
            untrack(() => {
                const scheme = ENGINE_SCHEMES[engine] || "db";
                if (data.url) {
                    // Check if there is an existing scheme to replace
                    if (data.url.includes("://")) {
                        data.url = data.url.replace(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//, `${scheme}://`);
                    } else {
                        // Prepend scheme if missing
                        data.url = `${scheme}://${data.url}`;
                    }
                } else {
                    // If URL is empty, just initialize with prefix
                    data.url = `${scheme}://`;
                }
            });
        }
    });

</script>

<div class="uk-margin">
    <legend class="uk-legend uk-text-bold">{title}</legend>
</div>

<div class="uk-margin">
    <label class="uk-form-label" for="form-db-engine">Database Engine</label>
    <div class="uk-form-controls">
        <select bind:value={data.engine} class="uk-select uk-border-rounded" id="form-db-engine" required>
            <option value="" disabled selected>Select an engine</option>
            {#each ENGINES as engine}
                <option value={engine}>{engine}</option>
            {/each}
        </select>
    </div>
</div>

<div class="uk-margin">
    <span class="uk-form-label" id="form-db-connection-type">Connection Type</span>
    <div class="x-pill-toggle" role="group" aria-labelledby="form-db-connection-type">
        <button
            type="button"
            class="x-pill-btn"
            class:x-pill-active={connectionType === "URL"}
            onclick={() => { connectionType = "URL"; }}
        >
            Connection URL
        </button>
        <button
            type="button"
            class="x-pill-btn"
            class:x-pill-active={connectionType === "PARAMETERS"}
            onclick={() => { connectionType = "PARAMETERS"; }}
        >
            Individual Parameters
        </button>
    </div>
</div>

{#if connectionType === "URL"}
    <div class="uk-margin">
        <label class="uk-form-label" for="form-db-url">Connection URL</label>
        <div class="uk-form-controls">
            <input bind:value={data.url} class="uk-input uk-border-rounded" id="form-db-url" type="text" placeholder="postgresql://user:pass@host:port/dbname" required>
        </div>
    </div>
{:else}
    <div class="uk-margin">
        <label class="uk-form-label" for="form-db-host">Host</label>
        <div class="uk-form-controls">
            <input bind:value={data.host} class="uk-input uk-border-rounded" id="form-db-host" type="text" placeholder="localhost or 127.0.0.1" required>
        </div>
    </div>

    { /* @ts-ignore */ null }
    <div class="uk-grid-small uk-child-width-1-2@s" uk-grid>
        <div>
            <label class="uk-form-label" for="form-db-port">Port</label>
            <div class="uk-form-controls">
                <input bind:value={data.port} class="uk-input uk-border-rounded" id="form-db-port" type="text" placeholder="5432">
            </div>
        </div>
        <div>
            <label class="uk-form-label" for="form-db-database">Database Name</label>
            <div class="uk-form-controls">
                <input bind:value={data.database} class="uk-input uk-border-rounded" id="form-db-database" type="text" placeholder="mydb">
            </div>
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-db-username">Username</label>
        <div class="uk-form-controls">
            <input bind:value={data.username} class="uk-input uk-border-rounded" id="form-db-username" type="text" placeholder="admin">
        </div>
    </div>

    <div class="uk-margin">
        <label class="uk-form-label" for="form-db-password">Password</label>
        <div class="uk-form-controls">
            <input bind:value={data.password} class="uk-input uk-border-rounded" id="form-db-password" type="password" placeholder="••••••••">
        </div>
    </div>
{/if}

<style>
    .x-pill-toggle {
        display: inline-flex;
        border: 1px solid #d0d5dd;
        border-radius: 8px;
        overflow: hidden;
        background: #f5f7fa;
    }

    .x-pill-btn {
        flex: 1;
        padding: 6px 18px;
        font-size: 0.85rem;
        font-weight: 500;
        border: none;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        transition: background 0.18s ease, color 0.18s ease;
        white-space: nowrap;
    }

    .x-pill-btn:hover:not(.x-pill-active) {
        background: #e8edf3;
        color: #374151;
    }

    .x-pill-active {
        background: #1e3a5f;
        color: #ffffff;
        border-radius: 6px;
    }
</style>

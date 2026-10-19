<script lang="ts">
    import { getContext, onMount } from "svelte";

    import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import {
        VaultDetailTextField,
        VaultDetailPasswordField,
    } from "$lib/models/data";
    import { loadVaultItemDetailFromStore } from "$lib/vaults";
    import { paramsToUrl, urlToParams } from "$lib/utils/database";

    import type { SymmetricKey } from "$lib/models/keys";
    import {
        CipherType,
        type CipherDatabaseData,
        type VaultItemDetail,
    } from "$lib/types";

    let { vaultId } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let vaultItemDetail: VaultItemDetail<CipherDatabaseData> | null =
        $state(null);
    let displayMode: "URL" | "PARAMETERS" | "SNIPPET" = $state("URL");

    const fields = $derived.by(() => {
        if (!vaultItemDetail) return [];

        const d = vaultItemDetail.data;
        const engineField = new VaultDetailTextField(d.engine, "Engine");
        const fullUrl = d.url ? d.url : paramsToUrl(d);

        if (displayMode === "URL") {
            return [
                engineField,
                new VaultDetailPasswordField(fullUrl || null, "Connection URL"),
            ].filter((f) => f.value);
        } else if (displayMode === "PARAMETERS") {
            let host = d.host,
                port = d.port,
                database = d.database,
                username = d.username,
                password = d.password;

            if (!host && d.url) {
                const parsed = urlToParams(d.url);
                host = parsed.host;
                port = parsed.port;
                database = parsed.database;
                username = parsed.username;
                password = parsed.password;
            }

            return [
                engineField,
                host ? new VaultDetailTextField(host, "Host") : null,
                port ? new VaultDetailTextField(port, "Port") : null,
                database
                    ? new VaultDetailTextField(database, "Database")
                    : null,
                username
                    ? new VaultDetailTextField(username, "Username")
                    : null,
                password
                    ? new VaultDetailPasswordField(password, "Password")
                    : null,
            ].filter(Boolean) as any[];
        } else {
            // CLI / .env Snippet mode
            const envLine = `DATABASE_URL="${fullUrl}"`;
            let cliCmd = "";
            const eng = (d.engine || "").toLowerCase();
            if (eng.includes("postgres")) cliCmd = `psql "${fullUrl}"`;
            else if (eng.includes("redis")) cliCmd = `redis-cli -u "${fullUrl}"`;
            else if (eng.includes("mongo")) cliCmd = `mongosh "${fullUrl}"`;
            else if (eng.includes("mysql") || eng.includes("maria"))
                cliCmd = `mysql "${fullUrl}"`;

            return [
                engineField,
                new VaultDetailPasswordField(envLine, ".env Variable"),
                cliCmd ? new VaultDetailPasswordField(cliCmd, "CLI Command") : null,
            ].filter(Boolean) as any[];
        }
    });

    onMount(async () => {
        let sk: SymmetricKey = await extractSymmetricKey(mk, epsk);
        vaultItemDetail =
            await loadVaultItemDetailFromStore<CipherDatabaseData>(vaultId, sk);
        displayMode =
            (vaultItemDetail.data.connectionType as "URL" | "PARAMETERS") ??
            "URL";
    });
</script>

{#if vaultItemDetail}
    <ViewItemForm
        itemType={CipherType.DATABASE}
        subtitle="{vaultItemDetail.data.engine || 'Database'} Connection"
        itemDetails={{
            name: vaultItemDetail.name,
            notes: vaultItemDetail.notes,
        }}
        itemHistory={{
            created: vaultItemDetail.created,
            lastEdited: vaultItemDetail.updated,
        }}
        detailTitle="Database Credentials"
        {fields}
    >
        {#snippet beforeFields()}
            <div
                class="grid grid-cols-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900 p-1"
                role="group"
                aria-label="View connection as"
            >
                <button
                    type="button"
                    onclick={() => (displayMode = "URL")}
                    class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {displayMode === 'URL'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
                >
                    Connection URL
                </button>
                <button
                    type="button"
                    onclick={() => (displayMode = "PARAMETERS")}
                    class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {displayMode === 'PARAMETERS'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
                >
                    Parameters
                </button>
                <button
                    type="button"
                    onclick={() => (displayMode = "SNIPPET")}
                    class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {displayMode === 'SNIPPET'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
                >
                    CLI & .env
                </button>
            </div>
        {/snippet}
    </ViewItemForm>
{/if}

<script lang="ts">
    import { untrack } from "svelte";
    import Icon from "@iconify/svelte";
    import type { CipherDatabaseData } from "$lib/types";
    import {
        ENGINE_SCHEMES,
        paramsToUrl,
        urlToParams,
    } from "$lib/utils/database";
    import { generateSecret } from "$lib/password-generator";

    let {
        title = "Database Credentials",
        data = $bindable(),
    }: { title?: string; data: CipherDatabaseData } = $props();

    const ENGINES = Object.keys(ENGINE_SCHEMES);

    let connectionType = $state(data.connectionType ?? "URL");
    let showPassword = $state(false);
    let mounted = false;

    $effect(() => {
        const mode = connectionType;
        untrack(() => {
            data.connectionType = mode;

            if (mounted) {
                if (mode === "URL") {
                    data.url = paramsToUrl(data);
                    data.host = "";
                    data.port = "";
                    data.database = "";
                    data.username = "";
                    data.password = "";
                } else {
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

    $effect(() => {
        const engine = data.engine;
        if (connectionType === "URL" && mounted) {
            untrack(() => {
                const scheme = ENGINE_SCHEMES[engine] || "db";
                if (data.url) {
                    if (data.url.includes("://")) {
                        data.url = data.url.replace(
                            /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//,
                            `${scheme}://`
                        );
                    } else {
                        data.url = `${scheme}://${data.url}`;
                    }
                } else {
                    data.url = `${scheme}://`;
                }
            });
        }
    });
</script>

<div class="space-y-4">
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
    </h3>

    <!-- Engine Selector -->
    <div>
        <label
            for="form-db-engine"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Database Engine
        </label>
        <select
            id="form-db-engine"
            bind:value={data.engine}
            required
            class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
            <option value="" disabled selected>Select an engine...</option>
            {#each ENGINES as engine}
                <option value={engine}>{engine}</option>
            {/each}
        </select>
    </div>

    <!-- Connection Type Pill Toggle -->
    <div>
        <span class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Connection Mode
        </span>
        <div
            class="mt-1.5 grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1"
            role="group"
            aria-label="Connection type"
        >
            <button
                type="button"
                onclick={() => (connectionType = "URL")}
                class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {connectionType === 'URL'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
            >
                Connection URL
            </button>
            <button
                type="button"
                onclick={() => (connectionType = "PARAMETERS")}
                class="rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer {connectionType === 'PARAMETERS'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'}"
            >
                Individual Parameters
            </button>
        </div>
    </div>

    {#if connectionType === "URL"}
        <div>
            <label
                for="form-db-url"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Connection URL
            </label>
            <input
                id="form-db-url"
                type="text"
                bind:value={data.url}
                placeholder="postgresql://user:pass@host:5432/dbname"
                required
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>
    {:else}
        <div>
            <label
                for="form-db-host"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Host
            </label>
            <input
                id="form-db-host"
                type="text"
                bind:value={data.host}
                placeholder="localhost or db.internal.net"
                required
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label
                    for="form-db-port"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Port
                </label>
                <input
                    id="form-db-port"
                    type="text"
                    bind:value={data.port}
                    placeholder="5432"
                    class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>

            <div>
                <label
                    for="form-db-database"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Database Name
                </label>
                <input
                    id="form-db-database"
                    type="text"
                    bind:value={data.database}
                    placeholder="production_db"
                    class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
            </div>
        </div>

        <div>
            <label
                for="form-db-username"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Username
            </label>
            <input
                id="form-db-username"
                type="text"
                bind:value={data.username}
                placeholder="postgres"
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>

        <div>
            <div class="flex items-center justify-between">
                <label
                    for="form-db-password"
                    class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                    Password
                </label>
                <button
                    type="button"
                    onclick={() => {
                        data.password = generateSecret({
                            mode: "password",
                            length: 24,
                            uppercase: true,
                            lowercase: true,
                            digits: true,
                            symbols: false,
                            avoidAmbiguous: true,
                            wordCount: 4,
                            separator: "-",
                            capitalizeWords: false,
                            includeNumberInPassphrase: true,
                        });
                        showPassword = true;
                    }}
                    class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                    <Icon icon="hugeicons:magic-wand-01" width="13" height="13" />
                    <span>Generate URI-Safe Password</span>
                </button>
            </div>
            <div class="relative mt-1.5">
                <input
                    id="form-db-password"
                    type={showPassword ? "text" : "password"}
                    bind:value={data.password}
                    placeholder="••••••••••••"
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                    type="button"
                    aria-label="Toggle database password visibility"
                    onclick={() => (showPassword = !showPassword)}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                    <Icon
                        icon="hugeicons:{showPassword ? 'view-off-slash' : 'view'}"
                        width="18"
                        height="18"
                    />
                </button>
            </div>
        </div>
    {/if}
</div>

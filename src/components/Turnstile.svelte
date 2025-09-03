<script lang="ts">
    import { onMount } from "svelte";
    import type { Action } from "svelte/action";

    interface TurnstileParams {
        sitekey: string
        action?: string
        execution?: "render" | "execute";
	    size?: "normal" | "flexible" | "compact" | "invisible";
        retry?: "auto" | "never";
        "retry-interval"?: number;
        /**
         * Triggered when the challenge is successfully completed.
         * @param cfToken callback token value that can be validated.
         * @param preClearanceObtained - A boolean indicating if the clearance was obtained.
         */
        callback: (cfToken: string, preClearanceObtained: boolean) => void
    }

    let {
        sitekey,
        action,
        execution = "render",
        size = "flexible",
        retry = "auto",
        retryInterval = 8000,
        callback
    }: {
        sitekey: TurnstileParams["sitekey"],
        action: TurnstileParams["action"],
        execution?: TurnstileParams["execution"],
        size?: TurnstileParams["size"],
        retry?: TurnstileParams["retry"],
        retryInterval?: TurnstileParams["retry-interval"],
        callback: TurnstileParams["callback"],
    } = $props();

    const renderParams = $state({
        sitekey: sitekey,
        "retry-interval": retryInterval,
        action,
        execution,
        retry,
        size,
        callback,
    } satisfies TurnstileParams);

    let mounted = $state(false);
    let loaded = $state(typeof window != "undefined" && "turnstile" in window);

    const turnstileAction: Action<HTMLElement, TurnstileParams> = (node: HTMLElement, params: TurnstileParams) => {
        let widgetId = window.turnstile.render("#turnstile-widget", params);

		return {
			destroy() {
				window.turnstile.remove(widgetId);
			},
			update(newParams) {
				window.turnstile.remove(widgetId);
				widgetId = window.turnstile.render(node, newParams);
			},
		};
    };

    onMount(() => {
        mounted = true;

        if (!loaded) {
            const script = document.createElement("script");
			script.type = "text/javascript";
			script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
			script.async = true;
			script.addEventListener("load", () => (loaded = true), {
				once: true,
			});
			document.head.appendChild(script);
        }
    });

</script>

{#if loaded && mounted}
    <div class="uk-margin-small-top">
        <div class="uk-text-meta uk-margin-small">Let us know you're human.</div>
        <div use:turnstileAction={renderParams} id="turnstile-widget"></div>
    </div>
{/if}

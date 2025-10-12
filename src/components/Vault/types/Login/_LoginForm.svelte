<script lang="ts">
    import Icon from "@iconify/svelte";

    let { data } = $props();

    let togglePassword = $state(false);

</script>

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

<script lang="ts">
    let { onclick, icon, text } = $props();
</script>

<button onclick={onclick} class="uk-button uk-button-default uk-button-small uk-border-rounded x-icon-button">
    <span class="x-button-icon" uk-icon="icon: {icon}"></span> 
    <span class="x-button-text uk-text-middle">{text}</span>
</button>

<style>
    .x-icon-button {
        padding: 0 10px;
        border: none;
    }

    .x-icon-button:hover {
        background: #E3F2FD;
    }

    .x-icon-button .x-button-icon {
        margin-right: 5px;
    }
    .x-icon-button .x-button-text {
        margin-right: 5px;
    }

</style>
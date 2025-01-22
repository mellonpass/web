<script>
    let { onclick } = $props();
</script>

<button onclick={onclick} class="uk-button uk-button-default uk-border-rounded x-icon-button">
    <span class="x-button-icon" uk-icon="icon: pencil"></span> 
    <span class="x-button-text uk-text-middle">Edit</span>
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
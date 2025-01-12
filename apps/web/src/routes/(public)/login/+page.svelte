<script>
    import Login from "$components/Login.svelte";
    
    let { data } = $props();
    let render = data.render;
</script>


{#if render}
    <Login />
{/if}

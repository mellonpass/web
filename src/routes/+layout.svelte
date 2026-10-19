<script lang="ts">
    import "$lib/assets/css/styles.css";
    import ToastContainer from "$components/ui/ToastContainer.svelte";

    let { children } = $props();
</script>

{@render children()}
<ToastContainer />

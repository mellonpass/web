<script lang="ts">
    let { children } = $props();
</script>

<section class="h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
    {@render children()}
</section>

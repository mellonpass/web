<script>
	let { children } = $props();
</script>

<div class="uk-flex uk-flex-center">
    <section class="uk-width-1-3">
        {@render children()}
    </section>
</div>

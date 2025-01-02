<script>
	let { code } = $props();
</script>

<div class="uk-flex uk-flex-center">
    <section class="uk-width-1-1 uk-text-center">
        <header>
            <h2>Page Error</h2>
        </header>
        
        <p class="uk-text-large uk-text-light">
            {code}
        </p>
    </section>
</div>

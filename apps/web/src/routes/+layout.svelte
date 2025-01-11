<script>
	let { children } = $props();
</script>


<section class="uk-height-viewport">
    <header class="uk-container">
        <div class="uk-navbar-left">
            <a class="uk-navbar-item uk-logo" href="#" aria-label="Back to Home">MellonPass</a>
        </div>
    </header>

    {@render children()}
</section>

<script lang="ts">
	let { children } = $props();
</script>


<section class="uk-height-viewport">
    <header class="uk-container">
        <div class="uk-navbar-left">
            <a class="uk-navbar-item uk-logo" href="/" aria-label="Back to Home">MellonPass</a>
        </div>
    </header>

    <div class="uk-flex uk-flex-center uk-padding">
        <section class="uk-width-1-3@l uk-width-1-2@m uk-width-1-1@s">
            {@render children()}
        </section>
    </div>
</section>


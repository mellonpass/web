<script>
	let { message } = $props();
</script>

<header>
    <h2 class="uk-text-center">{message}</h2>
</header>

<div class="uk-card uk-card-medium uk-card-default uk-card-body">
    <p class="uk-text-center">
        Please restart registration or try logging in. You may already have an account
    </p>

    <div class="uk-margin-small">
        <a class="uk-button uk-button-primary uk-width-1-1" href="/sign-up">Restart registration</a>
    </div>

    <div class="uk-margin-small">
        <a class="uk-button uk-button-default uk-width-1-1" href="/login">Login</a>
    </div>
</div>
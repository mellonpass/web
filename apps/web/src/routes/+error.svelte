<script lang="ts">
    import { page } from '$app/state';
</script>

<div class="uk-section">
    <div class="uk-flex uk-flex-center">
        <section class="uk-width-1-1 uk-text-center">
            <header>
                <h2>Page Error</h2>
                <h1>{page.status} {page.error.message}</h1>
            </header>
        </section>
    </div>
</div>

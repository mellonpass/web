<script lang="ts">
	let { children } = $props();
</script>

<script>
  import NewOrganization from "../components/NewOrganization.svelte";
</script>
<nav>
  <!-- Other menu items -->
  <NewOrganization on:create={(e) => console.log("Organization created:", e.detail)} />
</nav>

<section class="uk-height-viewport">
    {@render children()}
</section>

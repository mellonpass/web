<script lang="ts">
  import NewOrganization from "../../components/NewOrganization.svelte";
</script>

<nav>
  <NewOrganization onCreate={(detail) => console.log("Organization created:", detail)} />
</nav>

<section class="uk-height-viewport">
  <slot />
</section>
<style>
  nav {
    padding: 1rem;
    background-color: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }

  section {
    padding: 1rem;
  }
</style>
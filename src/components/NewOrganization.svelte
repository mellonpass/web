<script lang="ts">
  export let onCreate: ((detail: { name: string }) => void) | undefined;

  let orgName = "";
  let showModal = false;

  function openModal() {
    showModal = true;
  }

  function closeModal() {
    showModal = false;
  }

  function createOrganization() {
    if (orgName.trim()) {
      onCreate?.({ name: orgName }); // call the parent callback
      orgName = "";
      closeModal();
    }
  }
</script>

<!-- Button to open modal -->
<button class="uk-button uk-button-primary" on:click={openModal}>
  New Organization
</button>

<!-- Modal -->
{#if showModal}
  <div class="uk-modal uk-open" style="display: block; background: rgba(0,0,0,0.5);">
    <div class="uk-modal-dialog uk-modal-body uk-margin-auto-vertical">
      <h3 class="uk-modal-title">Create New Organization</h3>
      <input
        class="uk-input uk-margin-small-top"
        placeholder="Enter organization name"
        bind:value={orgName}
      />

      <div class="uk-margin-top uk-flex uk-flex-right">
        <button class="uk-button uk-button-default" on:click={closeModal}>
          Cancel
        </button>
        <button class="uk-button uk-button-primary uk-margin-small-left" on:click={createOrganization}>
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

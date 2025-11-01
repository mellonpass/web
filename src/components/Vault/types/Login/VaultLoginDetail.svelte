<script lang="ts">
  import { getContext, onMount } from "svelte";

  import ViewItemForm from "$components/Vault/types/templates/ViewItemForm.svelte";

  import { extractSymmetricKey } from "$lib/key-generation";
  import { VaultLoginDetailComponentData } from "$lib/models/data";
  import { loadVaultItemDetailFromStore } from "$lib/vaults";

  import type { CipherLoginData, VaultItemDetail } from "$lib/types";

  const epsk: string = getContext("epsk");
  const mk: string = getContext("mk");

  let { vaultId } = $props();

  let vaultItemDetail: VaultItemDetail<CipherLoginData> | null = $state(null);
  let componentData: VaultLoginDetailComponentData | null = $state(null)

  onMount(async () => {
      const sk = await extractSymmetricKey(mk, epsk);
      vaultItemDetail = await loadVaultItemDetailFromStore<CipherLoginData>(vaultId, sk);
      componentData = new VaultLoginDetailComponentData(vaultItemDetail.data);
  });

</script>

{#if componentData}
    <ViewItemForm 
        itemDetails={
            {"name": vaultItemDetail!.name, "notes": vaultItemDetail!.notes}
        }
        detailTitle="Login Credentials"
        fields={componentData.fields} 
    />
{/if}

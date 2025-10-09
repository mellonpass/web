<script lang="ts">
    import ViewItemForm from "../templates/ViewItemForm.svelte";

    import { VaultCardDetailComponentData } from "$lib/models/data";

    let { cipher } = $props();
    const data = new VaultCardDetailComponentData(cipher.data);

</script>

<ViewItemForm 
    name={cipher.name}
    detailTitle="{cipher.data.brand || 'Card'} details"
    fields={data.getFields()} 
/>

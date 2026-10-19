<script lang="ts">
    import { getContext } from "svelte";
    import Icon from "@iconify/svelte";

    import LoginForm from "$components/Vault/types/Login/_LoginForm.svelte";
    import ItemForm from "$components/Vault/types/templates/CreateUpdateItemForm.svelte";

    import { activeAddModal, newVaultItem } from "$lib/stores";
    import { CipherType, type CipherLoginData } from "$lib/types";
    import { createVaultItem } from "$lib/vaults";
    import { toast } from "$lib/toast.svelte";

    let {
        onClose = undefined,
    }: {
        onClose?: (() => void) | undefined;
    } = $props();

    const mk: string = getContext("mk");
    const epsk: string = getContext("epsk");

    let itemDetails = $state({
        name: "Login",
        notes: "",
    });
    let itemData: CipherLoginData = $state({
        username: "",
        password: "",
        authenticatorKey: "",
        url: "",
    });
    let errors: Array<string> = $state([]);
    let saving = $state(false);

    function close() {
        if (onClose) onClose();
        else $activeAddModal = null;
    }

    const onSubmit = async (e: any) => {
        e.preventDefault();
        if (!e.target.checkValidity()) return;

        saving = true;
        errors = [];
        try {
            $newVaultItem = await createVaultItem({
                mk: mk,
                epsk: epsk,
                name: itemDetails.name,
                notes: itemDetails.notes,
                content: itemData.username || itemData.url || itemDetails.name,
                itemData: itemData,
                cipherType: CipherType.LOGIN,
            });
            toast.show({
                title: `"${itemDetails.name}" saved to vault`,
                variant: "success",
            });
            close();
        } catch (error) {
            errors = [(error as Error).message];
        } finally {
            saving = false;
        }
    };
</script>

<div class="flex-1 overflow-y-auto px-6 py-4">
    <ItemForm id="loginForm" onsubmit={onSubmit} bind:itemDetails {errors}>
        <LoginForm title="Login Credentials" bind:data={itemData} />
    </ItemForm>
</div>

<div class="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
    <button
        type="button"
        onclick={close}
        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
    >
        Cancel
    </button>
    <button
        form="loginForm"
        type="submit"
        disabled={saving}
        class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs shadow-indigo-500/20 transition-colors cursor-pointer"
    >
        <Icon icon="hugeicons:tick-02" width="15" height="15" />
        <span>{saving ? "Encrypting..." : "Save Login"}</span>
    </button>
</div>

<script lang="ts">
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import {
        encryptOrgKeyWithPublicKey,
        generateOrganizationKey,
    } from "$lib/key-generation";
    import { whoami as fetchWhoami } from "$lib/services/accounts";
    import { createOrganization } from "$lib/services/organizations";
    import { isCreateOrgModalOpen, organizationStore } from "$lib/stores";
    import { toast } from "$lib/toast.svelte";

    let orgName = $state("");
    let submitting = $state(false);
    let errorMsg: string | null = $state(null);

    $effect(() => {
        if (!$isCreateOrgModalOpen) {
            orgName = "";
            errorMsg = null;
            submitting = false;
        }
    });

    async function resolveOwnerPublicKey(): Promise<string> {
        try {
            const raw = localStorage.getItem("whoami");
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed?.rsa_public_key) {
                return parsed.rsa_public_key;
            }
        } catch {
            // Fall through to live whoami request
        }

        const resp = await fetchWhoami();
        const rsaPublicKey = resp?.data?.rsa_public_key;
        if (rsaPublicKey) {
            try {
                const payload = { ...resp.data };
                delete payload.auth;
                localStorage.setItem("whoami", JSON.stringify(payload));
            } catch {
                // Ignore storage errors
            }
            return rsaPublicKey;
        }

        throw new Error(
            "Your account RSA public key is unavailable. Please unlock or log in again."
        );
    }

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = orgName.trim();
        if (!trimmed) {
            errorMsg = "Organization name is required.";
            return;
        }

        submitting = true;
        errorMsg = null;
        const osk = generateOrganizationKey();
        let saved = false;

        try {
            const publicKey = await resolveOwnerPublicKey();
            const protectedSymmetricKey = await encryptOrgKeyWithPublicKey(
                publicKey,
                osk
            );
            const newOrg = await createOrganization(
                trimmed,
                protectedSymmetricKey
            );

            organizationStore.setDecryptedKey(newOrg.id, osk);
            saved = true;

            organizationStore.setOrganizations([
                ...$organizationStore.organizations,
                newOrg,
            ]);
            organizationStore.setVaultContext(newOrg.id);

            toast.show({
                title: `Organization "${newOrg.name}" created`,
                variant: "success",
            });
            $isCreateOrgModalOpen = false;
        } catch (err: any) {
            errorMsg = err?.message || "Failed to create organization.";
        } finally {
            if (!saved) {
                try {
                    osk.keybuffer.fill(0);
                } catch {}
            }
            submitting = false;
        }
    }
</script>

<Dialog.Root bind:open={$isCreateOrgModalOpen}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl focus:outline-none"
        >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div class="flex items-center gap-2.5">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <Icon icon="hugeicons:building-03" width="20" height="20" />
                    </div>
                    <div>
                        <Dialog.Title class="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Create Organization
                        </Dialog.Title>
                        <Dialog.Description class="text-xs text-slate-500 dark:text-slate-400">
                            Share end-to-end encrypted vault items with your team
                        </Dialog.Description>
                    </div>
                </div>
                <Dialog.Close
                    aria-label="Close create organization dialog"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                </Dialog.Close>
            </div>

            <form onsubmit={handleSubmit} class="mt-4 space-y-4">
                <div>
                    <label
                        for="create-org-name"
                        class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                    >
                        Organization Name
                    </label>
                    <!-- svelte-ignore a11y_autofocus -->
                    <input
                        id="create-org-name"
                        type="text"
                        bind:value={orgName}
                        placeholder="e.g., Acme Engineering"
                        maxlength="150"
                        required
                        autofocus
                        class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p class="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        A 512-bit Organization Symmetric Key will be generated locally and encrypted with your RSA-OAEP public key.
                    </p>
                </div>

                {#if errorMsg}
                    <div
                        role="alert"
                        class="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
                    >
                        <Icon icon="hugeicons:alert-02" width="15" height="15" class="mt-0.5 shrink-0 text-rose-500" />
                        <span>{errorMsg}</span>
                    </div>
                {/if}

                <div class="flex items-center justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onclick={() => ($isCreateOrgModalOpen = false)}
                        class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                        <Icon icon="hugeicons:tick-02" width="15" height="15" />
                        <span>{submitting ? "Generating Keys..." : "Create Organization"}</span>
                    </button>
                </div>
            </form>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

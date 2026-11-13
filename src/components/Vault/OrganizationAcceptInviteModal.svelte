<script lang="ts">
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import { acceptOrganizationInvite } from "$lib/services/organizations";
    import { isAcceptInviteModalOpen } from "$lib/stores";
    import { toast } from "$lib/toast.svelte";
    import type { OrganizationMember } from "$lib/types";

    let inviteToken = $state("");
    let submitting = $state(false);
    let errorMsg: string | null = $state(null);
    let acceptedMembership: OrganizationMember | null = $state(null);

    $effect(() => {
        if (!$isAcceptInviteModalOpen) {
            inviteToken = "";
            errorMsg = null;
            submitting = false;
            acceptedMembership = null;
        }
    });

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = inviteToken.trim();
        if (!trimmed) {
            errorMsg = "Invitation token is required.";
            return;
        }

        submitting = true;
        errorMsg = null;
        try {
            acceptedMembership = await acceptOrganizationInvite(trimmed);
            toast.show({
                title: "Invitation accepted",
                description:
                    "An organization Owner or Admin must now confirm your membership to share the vault key.",
                variant: "success",
            });
        } catch (err: any) {
            errorMsg = err?.message || "Failed to accept organization invite.";
        } finally {
            submitting = false;
        }
    }
</script>

<Dialog.Root bind:open={$isAcceptInviteModalOpen}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl focus:outline-none"
        >
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div class="flex items-center gap-2.5">
                    <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                        <Icon icon="hugeicons:mail-open-02" width="20" height="20" />
                    </div>
                    <div>
                        <Dialog.Title class="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Accept Organization Invite
                        </Dialog.Title>
                        <Dialog.Description class="text-xs text-slate-500 dark:text-slate-400">
                            Join an organization using your invitation token
                        </Dialog.Description>
                    </div>
                </div>
                <Dialog.Close
                    aria-label="Close accept invite dialog"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                </Dialog.Close>
            </div>

            {#if acceptedMembership}
                <div class="mt-4 space-y-4">
                    <div class="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 space-y-1.5">
                        <div class="flex items-center gap-2 font-semibold">
                            <Icon icon="hugeicons:checkmark-circle-02" width="16" height="16" class="text-emerald-600 dark:text-emerald-400" />
                            <span>Invitation Accepted ({acceptedMembership.status})</span>
                        </div>
                        <p class="leading-relaxed opacity-90">
                            Your account ({acceptedMembership.email}) is now linked with role <strong>{acceptedMembership.role}</strong>. Wait for an organization Owner or Admin to click <strong>Confirm Member</strong> so your browser receives the encrypted organization key.
                        </p>
                    </div>

                    <div class="flex justify-end">
                        <button
                            type="button"
                            onclick={() => ($isAcceptInviteModalOpen = false)}
                            class="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                </div>
            {:else}
                <form onsubmit={handleSubmit} class="mt-4 space-y-4">
                    <div>
                        <label
                            for="accept-invite-token"
                            class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
                        >
                            Invitation Token
                        </label>
                        <!-- svelte-ignore a11y_autofocus -->
                        <input
                            id="accept-invite-token"
                            type="text"
                            bind:value={inviteToken}
                            placeholder="Paste your organization invite token..."
                            required
                            autofocus
                            class="mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
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
                            onclick={() => ($isAcceptInviteModalOpen = false)}
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
                            <span>{submitting ? "Accepting..." : "Accept Invite"}</span>
                        </button>
                    </div>
                </form>
            {/if}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

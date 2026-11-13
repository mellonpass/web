<script lang="ts">
    import { getContext, untrack } from "svelte";
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import { getOrAwaitUserRsaPrivateKey } from "$lib/crypto-client";
    import {
        decryptOrgKeyWithPrivateKey,
        encryptOrgKeyWithPublicKey,
    } from "$lib/key-generation";
    import type { SymmetricKey } from "$lib/models/keys";
    import { getErrorMessage } from "$lib/requests";
    import {
        confirmOrganizationMember,
        getOrganizationMembers,
        getPendingMembers,
        inviteOrganizationUser,
        revokeOrganizationMember,
    } from "$lib/services/organizations";
    import {
        activeOrganization,
        isOrgAdminModalOpen,
        organizationStore,
    } from "$lib/stores";
    import { toast } from "$lib/toast.svelte";
    import {
        OrganizationMemberRole,
        OrganizationMemberStatus,
        type Organization,
        type OrganizationMember,
    } from "$lib/types";

    const reloadVault = getContext<(() => Promise<void>) | undefined>(
        "reloadVault"
    );

    let selectedOrgId: string | null = $state(null);
    let loadedOrgId: string | null = $state(null);
    let members: OrganizationMember[] = $state([]);
    let pendingMembers: OrganizationMember[] = $state([]);
    let loadingMembers = $state(false);
    let actionError: string | null = $state(null);

    let inviteEmail = $state("");
    let inviteRole: OrganizationMemberRole = $state(
        OrganizationMemberRole.MEMBER
    );
    let inviting = $state(false);
    let busyMemberIds: Record<string, boolean> = $state({});
    let confirmRevokeMemberId: string | null = $state(null);

    let loadGeneration = 0;
    let modalSession = 0;

    const targetOrg: Organization | null = $derived.by(() => {
        const orgs = $organizationStore.organizations;
        if (orgs.length === 0) return null;
        return (
            orgs.find((o) => o.id === selectedOrgId) ??
            $activeOrganization ??
            orgs[0]
        );
    });

    const currentUserRole = $derived(
        targetOrg?.currentUserMembership?.role ?? OrganizationMemberRole.MEMBER
    );

    const isAdminOrOwner = $derived(
        currentUserRole === OrganizationMemberRole.OWNER ||
            currentUserRole === OrganizationMemberRole.ADMIN
    );

    const isOrgDataReady = $derived(
        Boolean(targetOrg && loadedOrgId === targetOrg.id && !loadingMembers)
    );

    const confirmedOwnerCount = $derived(
        members.filter(
            (m) =>
                m.role === OrganizationMemberRole.OWNER &&
                m.status === OrganizationMemberStatus.CONFIRMED
        ).length
    );

    function setMemberBusy(memberId: string, busy: boolean) {
        if (busy) {
            busyMemberIds = { ...busyMemberIds, [memberId]: true };
            return;
        }
        const next = { ...busyMemberIds };
        delete next[memberId];
        busyMemberIds = next;
    }

    function getMemberPublicKey(member: OrganizationMember): string | null {
        return member.publicKey || member.user?.publicKey || null;
    }

    function isSelfMembership(
        org: Organization | null,
        member: OrganizationMember
    ): boolean {
        return Boolean(
            org?.currentUserMembership?.id &&
                member.id === org.currentUserMembership.id
        );
    }

    function isOwnerOnlyConfirmation(member: OrganizationMember): boolean {
        return (
            currentUserRole === OrganizationMemberRole.ADMIN &&
            member.role === OrganizationMemberRole.OWNER
        );
    }

    function canConfirmMember(member: OrganizationMember): boolean {
        if (!isAdminOrOwner) return false;
        if (member.status !== OrganizationMemberStatus.ACCEPTED) return false;
        if (isOwnerOnlyConfirmation(member)) return false;
        return Boolean(getMemberPublicKey(member));
    }

    async function loadMembersForOrg(org: Organization | null) {
        const currentGen = ++loadGeneration;
        const session = modalSession;

        if (!org) {
            members = [];
            pendingMembers = [];
            loadedOrgId = null;
            loadingMembers = false;
            confirmRevokeMemberId = null;
            return;
        }

        if (loadedOrgId !== org.id) {
            members = [];
            pendingMembers = [];
            loadedOrgId = null;
            confirmRevokeMemberId = null;
        }

        loadingMembers = true;
        actionError = null;
        try {
            const role = org.currentUserMembership?.role;
            const canViewPending =
                role === OrganizationMemberRole.OWNER ||
                role === OrganizationMemberRole.ADMIN;

            const [allMembers, pending] = await Promise.all([
                getOrganizationMembers(org.id),
                canViewPending
                    ? getPendingMembers(org.id)
                    : Promise.resolve([]),
            ]);
            if (currentGen !== loadGeneration || session !== modalSession) {
                return;
            }
            members = allMembers;
            pendingMembers = pending;
            loadedOrgId = org.id;
        } catch (err: unknown) {
            if (currentGen !== loadGeneration || session !== modalSession) {
                return;
            }
            actionError = getErrorMessage(
                err,
                "Failed to load organization members."
            );
        } finally {
            if (currentGen === loadGeneration && session === modalSession) {
                loadingMembers = false;
            }
        }
    }

    $effect(() => {
        if ($isOrgAdminModalOpen) {
            modalSession++;
            untrack(() => {
                selectedOrgId =
                    $activeOrganization?.id ??
                    $organizationStore.organizations[0]?.id ??
                    null;
            });
        } else {
            modalSession++;
            loadGeneration++;
            selectedOrgId = null;
            loadedOrgId = null;
            members = [];
            pendingMembers = [];
            loadingMembers = false;
            inviteEmail = "";
            inviteRole = OrganizationMemberRole.MEMBER;
            inviting = false;
            actionError = null;
            busyMemberIds = {};
            confirmRevokeMemberId = null;
        }
    });

    $effect(() => {
        const orgId = targetOrg?.id ?? null;
        if ($isOrgAdminModalOpen && orgId) {
            untrack(() => {
                void loadMembersForOrg(targetOrg);
            });
        }
    });

    async function resolveOrgSymmetricKey(
        org: Organization
    ): Promise<SymmetricKey> {
        const cached = organizationStore.getDecryptedKey(org.id);
        if (cached) return cached;

        const protectedKey = org.currentUserMembership?.protectedSymmetricKey;
        if (!protectedKey) {
            throw new Error(
                "Protected organization key is missing for your membership."
            );
        }
        const privateKey = await getOrAwaitUserRsaPrivateKey();
        if (!privateKey) {
            throw new Error(
                "Your RSA private key is not unlocked in memory. Please unlock your vault again."
            );
        }

        const osk = await decryptOrgKeyWithPrivateKey(privateKey, protectedKey);
        organizationStore.setDecryptedKey(org.id, osk);
        return osk;
    }

    async function handleInvite(e: SubmitEvent) {
        e.preventDefault();
        const org = targetOrg;
        if (!org) return;

        const email = inviteEmail.trim();
        if (!email) return;

        const session = modalSession;
        inviting = true;
        actionError = null;
        try {
            await inviteOrganizationUser(org.id, email, inviteRole);
            toast.show({
                title: `Invitation sent to ${email}`,
                variant: "success",
            });
            if (session !== modalSession) return;
            inviteEmail = "";
            inviteRole = OrganizationMemberRole.MEMBER;
            if (targetOrg?.id === org.id) {
                await loadMembersForOrg(org);
            }
        } catch (err: unknown) {
            if (session !== modalSession) return;
            actionError = getErrorMessage(err, "Failed to invite user.");
        } finally {
            if (session === modalSession) {
                inviting = false;
            }
        }
    }

    async function handleConfirmMember(member: OrganizationMember) {
        const org = targetOrg;
        if (!org || loadedOrgId !== org.id || !canConfirmMember(member)) {
            return;
        }

        const session = modalSession;
        setMemberBusy(member.id, true);
        actionError = null;
        try {
            const memberPublicKey = getMemberPublicKey(member);
            if (!memberPublicKey) {
                throw new Error(
                    `No RSA public key found for ${member.email}. Ensure they have completed account setup.`
                );
            }

            const osk = await resolveOrgSymmetricKey(org);
            const protectedOsk = await encryptOrgKeyWithPublicKey(
                memberPublicKey,
                osk
            );
            await confirmOrganizationMember(member.id, protectedOsk);

            toast.show({
                title: `Confirmed ${member.email}`,
                description: "Organization encryption key shared securely.",
                variant: "success",
            });
            if (session === modalSession && targetOrg?.id === org.id) {
                await loadMembersForOrg(org);
            }
        } catch (err: unknown) {
            if (session === modalSession) {
                actionError = getErrorMessage(err, "Failed to confirm member.");
            }
        } finally {
            if (session === modalSession) {
                setMemberBusy(member.id, false);
            }
        }
    }

    async function handleRevokeMember(member: OrganizationMember) {
        const org = targetOrg;
        if (!org || loadedOrgId !== org.id || !canRevokeMember(member)) {
            return;
        }

        const session = modalSession;
        const revokingSelf = isSelfMembership(org, member);
        confirmRevokeMemberId = null;
        setMemberBusy(member.id, true);
        actionError = null;
        try {
            await revokeOrganizationMember(member.id);
            toast.show({
                title: revokingSelf
                    ? `Left ${org.name}`
                    : `Revoked access for ${member.email}`,
                variant: "warning",
            });

            if (revokingSelf) {
                const remainingOrgs = $organizationStore.organizations.filter(
                    (o) => o.id !== org.id
                );
                organizationStore.setOrganizations(remainingOrgs);
                void reloadVault?.();
                if (session === modalSession && remainingOrgs.length === 0) {
                    $isOrgAdminModalOpen = false;
                }
                return;
            }

            if (session === modalSession && targetOrg?.id === org.id) {
                await loadMembersForOrg(org);
            }
        } catch (err: unknown) {
            if (session === modalSession) {
                actionError = getErrorMessage(err, "Failed to revoke member.");
            }
        } finally {
            if (session === modalSession) {
                setMemberBusy(member.id, false);
            }
        }
    }

    function canRevokeMember(member: OrganizationMember): boolean {
        if (!isAdminOrOwner) return false;
        if (
            currentUserRole === OrganizationMemberRole.ADMIN &&
            member.role === OrganizationMemberRole.OWNER
        ) {
            return false;
        }
        if (
            member.role === OrganizationMemberRole.OWNER &&
            member.status === OrganizationMemberStatus.CONFIRMED &&
            confirmedOwnerCount <= 1
        ) {
            return false;
        }
        return true;
    }

    function statusBadgeClasses(status: OrganizationMemberStatus): string {
        switch (status) {
            case OrganizationMemberStatus.CONFIRMED:
                return "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
            case OrganizationMemberStatus.ACCEPTED:
                return "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
            case OrganizationMemberStatus.INVITED:
                return "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300";
            default:
                return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
        }
    }
</script>

<Dialog.Root bind:open={$isOrgAdminModalOpen}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[88vh] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl focus:outline-none"
        >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <Icon icon="hugeicons:user-group" width="20" height="20" />
                    </div>
                    <div class="min-w-0">
                        <Dialog.Title class="truncate text-base font-bold text-slate-900 dark:text-white">
                            {targetOrg ? `${targetOrg.name} — Members` : "Organization Management"}
                        </Dialog.Title>
                        <Dialog.Description class="text-xs text-slate-500 dark:text-slate-400">
                            Invite members, distribute RSA-encrypted org keys, and manage access
                        </Dialog.Description>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    {#if $organizationStore.organizations.length > 1 && targetOrg}
                        <select
                            aria-label="Select organization"
                            value={targetOrg.id}
                            onchange={(e) => (selectedOrgId = e.currentTarget.value)}
                            class="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                        >
                            {#each $organizationStore.organizations as org (org.id)}
                                <option value={org.id}>{org.name}</option>
                            {/each}
                        </select>
                    {/if}

                    <Dialog.Close
                        aria-label="Close organization management"
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                    </Dialog.Close>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {#if !targetOrg}
                    <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                        You are not a member of any organization yet.
                    </div>
                {:else}
                    {#if actionError}
                        <div
                            role="alert"
                            class="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300"
                        >
                            <Icon icon="hugeicons:alert-02" width="15" height="15" class="mt-0.5 shrink-0 text-rose-500" />
                            <span>{actionError}</span>
                        </div>
                    {/if}

                    <!-- Invite Form (Owner / Admin) -->
                    {#if isAdminOrOwner}
                        <form
                            onsubmit={handleInvite}
                            class="rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 p-4 space-y-3"
                        >
                            <div class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Invite New Member
                            </div>
                            <div class="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    bind:value={inviteEmail}
                                    placeholder="teammate@company.com"
                                    aria-label="Member email"
                                    required
                                    class="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <select
                                    aria-label="Member role"
                                    bind:value={inviteRole}
                                    class="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                                >
                                    <option value={OrganizationMemberRole.MEMBER}>Member</option>
                                    <option value={OrganizationMemberRole.ADMIN}>Admin</option>
                                    {#if currentUserRole === OrganizationMemberRole.OWNER}
                                        <option value={OrganizationMemberRole.OWNER}>Owner</option>
                                    {/if}
                                </select>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                                >
                                    <Icon icon="hugeicons:user-add-01" width="14" height="14" />
                                    <span>{inviting ? "Inviting..." : "Send Invite"}</span>
                                </button>
                            </div>
                        </form>
                    {/if}

                    <!-- Pending Key Confirmation Section -->
                    {#if isAdminOrOwner && isOrgDataReady && pendingMembers.length > 0}
                        <div class="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 p-4 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                                    <Icon icon="hugeicons:key-01" width="15" height="15" />
                                    <span>Pending Key Confirmation ({pendingMembers.length})</span>
                                </div>
                                <span class="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                                    Accepted invite — awaiting OSK sharing
                                </span>
                            </div>

                            <div class="space-y-2">
                                {#each pendingMembers as pending (pending.id)}
                                    {@const hasPublicKey = Boolean(getMemberPublicKey(pending))}
                                    {@const ownerApprovalOnly = isOwnerOnlyConfirmation(pending)}
                                    <div class="flex items-center justify-between gap-3 rounded-xl border border-amber-200/80 dark:border-amber-500/20 bg-white dark:bg-slate-900 px-3.5 py-2.5">
                                        <div class="min-w-0">
                                            <div class="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                                {pending.email}
                                            </div>
                                            <div class="text-[11px] text-slate-500 dark:text-slate-400">
                                                Role: {pending.role} • {hasPublicKey
                                                    ? "RSA Public Key ready"
                                                    : "Missing RSA Public Key"}
                                            </div>
                                        </div>
                                        {#if ownerApprovalOnly}
                                            <span class="shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                Owner approval required
                                            </span>
                                        {:else}
                                            <button
                                                type="button"
                                                disabled={!isOrgDataReady || !hasPublicKey || Boolean(busyMemberIds[pending.id])}
                                                onclick={() => handleConfirmMember(pending)}
                                                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-white transition-colors cursor-pointer"
                                            >
                                                <Icon icon="hugeicons:tick-02" width="14" height="14" />
                                                <span>
                                                    {busyMemberIds[pending.id]
                                                        ? "Sharing Key..."
                                                        : hasPublicKey
                                                          ? "Confirm Member"
                                                          : "Missing Key"}
                                                </span>
                                            </button>
                                        {/if}
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Members Table -->
                    <div>
                        <div class="mb-2 flex items-center justify-between px-1">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Members ({members.length})
                            </h3>
                            <button
                                type="button"
                                onclick={() => loadMembersForOrg(targetOrg)}
                                disabled={loadingMembers}
                                class="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50 cursor-pointer"
                            >
                                <Icon icon="hugeicons:refresh" width="13" height="13" />
                                <span>Refresh</span>
                            </button>
                        </div>

                        <div class="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-slate-900">
                            {#if loadingMembers && members.length === 0}
                                <div class="p-6 text-center text-xs text-slate-400">
                                    Loading members...
                                </div>
                            {:else if members.length === 0}
                                <div class="p-6 text-center text-xs text-slate-400">
                                    No active members found.
                                </div>
                            {:else}
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th class="px-4 py-2.5">Member</th>
                                                <th class="px-3 py-2.5">Role</th>
                                                <th class="px-3 py-2.5">Status</th>
                                                {#if isAdminOrOwner}
                                                    <th class="px-4 py-2.5 text-right">Actions</th>
                                                {/if}
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 dark:divide-slate-800/80">
                                            {#each members as member (member.id)}
                                                <tr class="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                                                    <td class="px-4 py-3">
                                                        <div class="font-semibold text-slate-900 dark:text-white">
                                                            {member.user?.name || member.email}
                                                        </div>
                                                        {#if member.user?.name}
                                                            <div class="text-[11px] text-slate-400">
                                                                {member.email}
                                                            </div>
                                                        {/if}
                                                    </td>
                                                    <td class="px-3 py-3">
                                                        <span class="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                                            {member.role}
                                                        </span>
                                                    </td>
                                                    <td class="px-3 py-3">
                                                        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold {statusBadgeClasses(member.status)}">
                                                            {member.status}
                                                        </span>
                                                    </td>
                                                    {#if isAdminOrOwner}
                                                        <td class="px-4 py-3 text-right">
                                                            <div class="inline-flex items-center gap-1.5">
                                                                {#if canConfirmMember(member)}
                                                                    <button
                                                                        type="button"
                                                                        disabled={!isOrgDataReady || Boolean(busyMemberIds[member.id])}
                                                                        onclick={() => handleConfirmMember(member)}
                                                                        class="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                {/if}
                                                                {#if canRevokeMember(member)}
                                                                    {#if confirmRevokeMemberId === member.id}
                                                                        <button
                                                                            type="button"
                                                                            disabled={!isOrgDataReady || Boolean(busyMemberIds[member.id])}
                                                                            onclick={() => handleRevokeMember(member)}
                                                                            class="rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                                                                        >
                                                                            {isSelfMembership(targetOrg, member)
                                                                                ? "Confirm Leave"
                                                                                : "Confirm Revoke"}
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            disabled={Boolean(busyMemberIds[member.id])}
                                                                            onclick={() => (confirmRevokeMemberId = null)}
                                                                            class="rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    {:else}
                                                                        <button
                                                                            type="button"
                                                                            disabled={!isOrgDataReady || Boolean(busyMemberIds[member.id])}
                                                                            onclick={() => (confirmRevokeMemberId = member.id)}
                                                                            class="rounded-lg border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-50 px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer"
                                                                        >
                                                                            {isSelfMembership(targetOrg, member)
                                                                                ? "Leave"
                                                                                : "Revoke"}
                                                                        </button>
                                                                    {/if}
                                                                {/if}
                                                            </div>
                                                        </td>
                                                    {/if}
                                                </tr>
                                            {/each}
                                        </tbody>
                                    </table>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

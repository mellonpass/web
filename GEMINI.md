# mellonpass-web — Frontend & E2EE Client Rules (GEMINI.md)

Browser SPA client for MellonPass. All E2EE cryptography executes exclusively in the browser using the native Web Crypto API (`crypto.subtle`) and background Web Workers. Builds to a static SPA via `@sveltejs/adapter-static`. Runtime port: `5173` (dev) / `80` (Nginx container).

## Tech Stack

- **Framework**: SvelteKit 2 (`@sveltejs/adapter-static` SPA with `/index.html` fallback), Svelte 5 (Runes: `$state`, `$derived`, `$effect`, `$props`), TypeScript 5.7
- **Runtime & Build**: Node 22 (`.nvmrc`), Vite 6, `vite-plugin-node-polyfills` (`buffer` support)
- **Styling & UI**: Tailwind CSS v4 (`@tailwindcss/vite`), Bits UI (`bits-ui`), Iconify (`@iconify/svelte` / Hugeicons)
- **Cryptography & Security Utilities**: Native Web Crypto API (`crypto.subtle`), Web Workers (`crypto.worker.ts`), `otplib` (RFC 6238 TOTP), `marked` + `DOMPurify` (sanitized Markdown notes)
- **Code Quality**: `svelte-check`, TypeScript strict checks, Prettier (`prettier`)

## Essential Commands

### Local Development

Create `.env.local` (not committed) with:

```ini
PUBLIC_SERVER_URL=http://localhost:8000
```

Never place secrets in `PUBLIC_*` variables because SvelteKit exposes them to the client bundle via `$env/static/public`.

```sh
nvm use 22
npm install
npm run dev        # http://localhost:5173
```

### Checking, Building & Formatting

```sh
npm run check         # Svelte + TypeScript type check
npm run check:watch   # Watch mode
npm run build         # Production static SPA output in /build
npm run preview       # Preview static build locally
npx prettier --write src/
```

## Directory & Module Map

```text
src/
  lib/
    key-generation.ts        # PBKDF2, HKDF, AES-256-CTR, HMAC-SHA256, RSA-OAEP-4096 key derivation
                             # and wrapping/unwrapping. CRITICAL CRYPTO FILE.
    models/
      keys.ts                # BaseKey, AESHMACKey, MasterKey, StretchedMasterKey, SymmetricKey,
                             # CipherKey, ProtectedData ([Ciphertext | MAC (32B) | IV (16B)]).
      data.ts                # Vault detail field view models & live VaultDetailTOTPField (otplib).
    workers/
      crypto.worker.ts       # Web Worker running DERIVE_SETUP_KEYS & DERIVE_LOGIN_KEYS off UI thread.
    crypto-client.ts         # Worker bridge with step/percentage progress callbacks + main-thread fallback.
    symmetric-encryption.ts  # Field-level & subtype-specific cipher encryption/decryption helpers.
    vaults.ts                # Two-stage vault orchestration (allVaultItemsStore preview cache vs.
                             # on-demand loadVaultItemDetailFromStore), per-edit CipherKey rotation,
                             # and lockVault() (in-memory OSK Uint8Array zeroing).
    stores.ts                # Reactive stores: cipherStore, allVaultItemsStore, vaultItemStore,
                             # selectedVaultItem, organizationStore, unlockedOrgKeysStore, etc.
    password-generator.ts    # Unbiased rejection-sampling CSPRNG password & 344-word passphrase
                             # generator, entropy strength evaluator, color-coded secret tokenizer.
    toast.svelte.ts          # Svelte 5 toast store + 30-second auto-clearing clipboard protection.
    theme.svelte.ts          # Daylight / Obsidian (dark mode) rune store (mp_theme in localStorage).
    utils/database.ts        # 10-engine bidirectional DB URI parser (paramsToUrl / urlToParams).
    requests.ts              # Fetch & gqlClient (credentials: "include", X-CSRFToken header).
    gql/
      ciphers/schema.ts      # GraphQL queries & mutations for ciphers.
      organizations/schema.ts # GraphQL queries & mutations for organizations.
    services/
      accounts.ts            # REST API clients (/accounts/*).
      ciphers.ts             # GraphQL cipher service wrappers.
      organizations.ts       # GraphQL organization & RSA handshake service wrappers.
    types.ts                 # Shared TS types: Cipher, VaultItem, CipherType, Organization, etc.
    bytes.ts                 # arrayBufferToBase64 / base64ToArrayBuffer helpers.
  routes/
    (public)/                # sign-up, account-setup, login (SPA auth guards in +layout.ts).
    (protected)/             # Main authenticated vault workspace (+page.svelte).
  components/
    Vault/
      VaultMain.svelte       # Root vault shell, 10-min inactivity auto-lock, shortcuts (Cmd/Ctrl+K,G,J,L).
      VaultSideNav.svelte    # Category & Organization context switcher.
      VaultNavbar.svelte     # Top bar, search, Watchtower toggle, pending invite badge.
      VaultContent.svelte    # Item detail/edit pane.
      VaultLock.svelte       # Soft-lock re-authentication overlay (/accounts/unlock).
      VaultWatchtower.svelte # 100% client-side password health audit (0-100% score).
      CommandPalette.svelte  # Global fuzzy search & quick-action launcher (Cmd/Ctrl+K).
      OrganizationCreateModal.svelte
      OrganizationAdminModal.svelte
      OrganizationAcceptInviteModal.svelte
      types/
        templates/           # Shared ViewItemForm (DOMPurify + Marked), CreateUpdateItemForm, field controls.
        Login/               # Login add/edit/detail + inline password generator & TOTP.
        Card/                # Payment card form (BIN brand detection) & virtual card hero banner.
        Database/            # 10-engine URL/parameter form & 3-way viewer (URL, Params, CLI & .env).
        SecureNote/          # Encrypted Markdown note add/edit/detail.
    ui/                      # PasswordGeneratorModal, ItemAvatar, ToastContainer.
    AppMain.svelte           # Hydrates & immediately scrubs post-login keys from browser storage.
    Login.svelte
    SignUp.svelte
    AccountSetup.svelte
    Turnstile.svelte         # Cloudflare Turnstile widget wrapper.
```

## Coding Standards & Security Invariants

- **Use Svelte 5 Runes & Tailwind CSS v4**: Write reactive state with `$state`, `$derived`, `$effect`, and `$props`, styling components cleanly with Tailwind CSS v4 utility classes supporting both light and `dark:` themes.
- **Keep `ProtectedData` byte layout invariant**: Never alter `[Ciphertext | MAC (32B) | IV (16B)]` or skip HMAC-SHA256 verification before decryption in `src/lib/models/keys.ts`.
- **Never persist plaintext keys or decrypted secrets**: `SymmetricKey`, `OrganizationSymmetricKey`, unwrapped RSA private keys, `allVaultItemsStore`, and `vaultItemStore` must reside strictly in volatile JS memory (never written to `localStorage` or `sessionStorage`, aside from the transient handoff scrubbed immediately in `AppMain.svelte`). Zero out `OSK` byte buffers (`osk.fill(0)`) on lock/logout.
- **Sanitize all rendered HTML**: Whenever rendering Markdown notes or rich text via `{@html ...}`, pass the output through `DOMPurify.sanitize()` first.
- **Enforce clipboard auto-clear**: Route copying of sensitive secrets (`password`, `securityCode`, `number`, `authenticatorKey`, `notes`) through `toast.copySecret(value, label, true)` so the 30-second clipboard wipe countdown (`CLIPBOARD_CLEAR_SECONDS = 30`) is active.
- **Rotate `CipherKey` on every edit**: Keep `encryptVaultDetailForUpdate()` generating a fresh 512-bit `CipherKey` on each item update.
- **Static SPA mode**: All routes run client-side (`adapter-static`, no SSR); keep auth checks in `+layout.ts` / `+page.ts` loaders. Path alias `$components` maps to `src/components/`.
- **Verification**: Always run `npm run check` and `npm run build` after changes, and verify interactive crypto flows end-to-end when modifying key derivation, worker messaging, or vault decryption.

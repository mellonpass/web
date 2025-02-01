<!-- 
    - Doesn't limit max length of master password
-->

<script lang="ts">
    import { createAnimationTriggerAction } from 'svelte-trigger-action';

    import { generateLoginhash, generateMasterKey, generateProtectedSymmetricKey, generateStretchedMasterKey } from '$lib/crypto';
    import { setupAccount } from '$lib/services/accounts';

    const { verifiedEmail } = $props();

    const { triggerAnimation, animationAction } = createAnimationTriggerAction()

    const HINT_LIMIT = 50;
    const PASSWORD_POINT_MULTIPLIER = 15;

    const mpRules = {
        "hasMinChar": /^.{12,}$/,  // min of 12 characters.
        "hasUpperCase": /[A-Z]/,
        "hasMultiUppercase": /(?=(.*[A-Z]){2})/,
        "hasSpecialChar": /\W+/,
        "hasMultiSpecialChar": /[^a-zA-Z0-9\s].*[^a-zA-Z0-9\s]/,
        "hasDigit": /\d/,
        "hasMultiDigit": /\d{2,}/,
    };

    // master password field attrs.
    let mpFieldVal = $state(null);
    let mpFieldToogle = $state(false);
    let mpFieldInvalid = $state(false);

    // master password confirm field attrs.
    let mpcFieldVal = $state(null);
    let mpcFieldToogle = $state(false);
    let mpcFieldInvalid = $state(false);

    // master password hint field attrs.
    let mphFieldVal = $state("");

    let progressBarVal = $derived.by(() => {
        let points = 0;
        for (const [name, regex] of Object.entries(mpRules)) {

            if (!mpRules.hasMinChar.test(mpFieldVal)) {
                return 0;
            }

            if (regex.test(mpFieldVal)) {
                points++;
            }
        }
        return points * PASSWORD_POINT_MULTIPLIER;
    });

    let progressBarIndicator = $derived(progressBarVal / 15);

    let progressBarClass = $derived.by(() => {
        if (progressBarIndicator >= 1 && progressBarIndicator <= 2) {
            return "progress-weak";
        } else if (progressBarIndicator == 3) {
            return "progress-weak-2";
        } else if (progressBarIndicator >= 4 && progressBarIndicator <= 5) {
            return "";  // default progress bar theme.
        } else if (progressBarIndicator >= 6) {
            return "progress-strong";
        }
    });

    const handleMphInput = (e) => {
        if (mphFieldVal.length > HINT_LIMIT) {
            mphFieldVal = mphFieldVal.slice(0, HINT_LIMIT);
        }
    };

    const onFormSubmit = async (e) => {
        e.preventDefault();

        mpFieldInvalid = mpFieldVal == null ? true : mpFieldInvalid;
        mpcFieldInvalid = mpcFieldVal == null ? true : mpcFieldInvalid;

        const invalidFields = (mpFieldInvalid || mpcFieldInvalid);

        if (invalidFields) {
            return;
        }

        // Master password is weak.
        if (progressBarIndicator <= 3) {
            triggerAnimation('shake');
            return;
        }

        const mk = await generateMasterKey(verifiedEmail, mpFieldVal);
        const loginHash = await generateLoginhash(mk, mpFieldVal);
        const smk = await generateStretchedMasterKey(mk);
        const psk = await generateProtectedSymmetricKey(smk);

        try {
            await setupAccount(verifiedEmail, loginHash, psk.toBase64(), mphFieldVal);
            window.location.assign('/login');
        } catch (error) {
            // TODO: Show error page here.
            throw error;
        }
    };

    $effect(() => {
        if (mpFieldVal == null) { return };
        mpFieldInvalid = !mpRules.hasMinChar.test(mpFieldVal);
    });

    $effect(() => {
        if (mpcFieldVal == null) { return };
        mpcFieldInvalid = mpcFieldVal != mpFieldVal;
    });

</script>

<header class="uk-text-center">
    <h2>Account setup</h2>
</header>

<form class="uk-margin-medium" onsubmit={onFormSubmit} novalidate>
    <div class="uk-margin">
        <div class="uk-margin-small">
            <label for="master-password">Master password</label>
        </div>

        <div class="uk-inline uk-width-100">
            <input
            class:uk-form-danger={mpFieldInvalid}
            class="uk-input"
            type={mpFieldToogle ? "text" : "password"}
            id="master-password"
            name="master-password"
            bind:value={mpFieldVal}
            >
            <a
                href={null}
                aria-label="eye-icon"
                class="uk-form-icon uk-form-icon-flip"
                uk-icon="icon: {mpFieldToogle ? 'eye-slash' : 'eye'}"
                onclick={() => {mpFieldToogle = !mpFieldToogle}}>
            </a>
        </div>

        {#if mpFieldInvalid}
            <div class="uk-margin-small uk-text-meta uk-text-danger">
                Master password should be a minimum of 12.
            </div>
        {:else}
            <p class:uk-text-danger={mpFieldInvalid} class="uk-text-meta uk-margin-remove-top">
                <strong>Important:</strong> Your master password cannot be recovered if you forget it! 12 characters minimum.
            </p>
        {/if}

        <progress
            use:animationAction
            class="uk-progress { progressBarClass }"
            value={progressBarVal}
            max="100">
        </progress>
    </div>

    <div class="uk-margin">
        <div class="uk-margin-small">
            <label for="confirm-password">Confirm master password</label>
        </div>

        <div class="uk-inline uk-width-100">
            <a
                href
                aria-label="eye-icon"
                class="uk-form-icon uk-form-icon-flip"
                uk-icon="icon: {mpcFieldToogle ? 'eye-slash' : 'eye'}"
                onclick={() => {mpcFieldToogle = !mpcFieldToogle}}
            >
            </a>
            <input
                class="uk-input"
                class:uk-form-danger={mpcFieldInvalid}
                type={mpcFieldToogle ? "text" : "password"}
                id="confirm-password"
                name="confirm-password"
                bind:value={mpcFieldVal}
            >
        </div>

        {#if mpcFieldInvalid}
            <div class="uk-margin-small uk-text-meta uk-text-danger">
                Master password mismatch.
            </div>
        {/if}

        <div class="uk-margin-small">
            <label for="hint">Master password hint</label>
        </div>
        <input
            class="uk-input"
            type="text"
            id="hint"
            name="hint"
            oninput={handleMphInput}
            bind:value={mphFieldVal}
        >
        <p class="uk-text-meta uk-margin-remove-top">
            If you forget your password, the password hint can be sent to your email. {mphFieldVal.length}/50 character maximum.
        </p>

    </div>

    <div class="uk-margin">
        <button class="uk-button uk-button-primary uk-width-1-1">Create account</button>
    </div>
</form>


<style>
    .uk-progress.progress-weak::-webkit-progress-value {
        background-color: #F44336;
    }
    .uk-progress.progress-weak::-moz-progress-bar {
        background-color: #F44336;
    }
    .uk-progress.progress-weak::-ms-fill {
        background-color: #F44336;
    }

    .uk-progress.progress-weak-2::-webkit-progress-value {
        background-color: #FDD835 ;
    }
    .uk-progress.progress-weak-2::-moz-progress-bar {
        background-color: #FDD835 ;
    }
    .uk-progress.progress-weak-2::-ms-fill {
        background-color: #FDD835 ;
    }

    .uk-progress.progress-strong::-webkit-progress-value {
        background-color: green ;
    }
    .uk-progress.progress-strong::-moz-progress-bar {
        background-color: green ;
    }
    .uk-progress.progress-strong::-ms-fill {
        background-color: green ;
    }

    :global(.shake) {
        animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
        transform: translate3d(0, 0, 0);
        backface-visibility: hidden;
        perspective: 1000px;
    }

    @keyframes shake {
        10%, 90% {
            transform: translate3d(-1px, 0, 0);
        }
        
        20%, 80% {
            transform: translate3d(4px, 0, 0);
        }

        30%, 50%, 70% {
            transform: translate3d(-4px, 0, 0);
        }

        40%, 60% {
            transform: translate3d(4px, 0, 0);
        }
    }
</style>

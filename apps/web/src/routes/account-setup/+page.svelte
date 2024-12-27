<script>
    const mpRules = {
        "hasMinChar": /^.{12,}$/,  // min of 12 characters.
        "hasUpperCase": /[A-Z]/,
        "hasMultiUppercase": /(?=(.*[A-Z]){2})/,
        "hasSpecialChar": /\W+/,
        "hasMultiSpecialChar": /[^a-zA-Z0-9\s].*[^a-zA-Z0-9\s]/,
        "hasDigit": /\d/,
        "hasMultiDigit": /\d{2,}/,
    };

    let mpFieldVal = $state("");
    let mpFieldInvalid = $state(false);

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
        return points * 15;
    });

    let progressBarStrengthIndicator = $derived.by(() => {
        const indicator = progressBarVal / 15
        if (indicator >= 1 && indicator <= 2) {
            return "progress-weak";
        } else if (indicator == 3) {
            return "progress-weak-2";
        } else if (indicator >= 4 && indicator <= 5) {
            return "";  // default progress bar theme.
        } else if (indicator >= 6) {
            return "progress-strong";
        }
    });

    const handleMpInputFocusOut = (e) => {
        mpFieldInvalid = !mpRules.hasMinChar.test(mpFieldVal);
    };

    const handleMpKeyup = (e) => {
        mpFieldInvalid = ["", null].includes(mpFieldVal);
    };


</script>

<div class="uk-flex uk-flex-center">
    <section class="uk-width-1-3">
        <header class="uk-text-center">
            <h2>Account setup</h2>
        </header>

        <form class="uk-margin-medium" action="#" novalidate>
            <div>
                <div class="uk-margin-small">
                    <label for="master-password">Master password</label>
                </div>
                <input
                    onfocusout={handleMpInputFocusOut}
                    onkeyup={handleMpKeyup}
                    class:uk-form-danger={mpFieldInvalid}
                    class="uk-input"
                    type="password"
                    id="master-password"
                    name="master-password"
                    bind:value={mpFieldVal}
                >
                <p class:uk-text-danger={mpFieldInvalid} class="uk-text-meta uk-margin-remove-top">
                    <strong>Important:</strong> Your master password cannot be recovered if you forget it! 12 character minimum.
                </p>
                {#if mpFieldInvalid}
                    <div class="uk-margin-small uk-text-default uk-text-danger">
                        Master password should be a minimum of 12.
                    </div>
                {/if}

                <progress
                    class="uk-progress { progressBarStrengthIndicator }"
                    value={progressBarVal}
                    max="100">
                </progress>
                <p class="uk-text-meta uk-margin-remove-top">
                    
                </p>
            </div>

            <div class="uk-margin">
                <div class="uk-margin-small">
                    <label for="confirm-password">Confirm master password</label>
                </div>
                <input
                    class="uk-input"
                    type="password"
                    id="confirm-password"
                    name="confirm-password"
                    required
                >

                <div class="uk-margin-small">
                    <label for="hint">Master password hint</label>
                </div>
                <input
                    class="uk-input"
                    type="text"
                    id="hint"
                    name="hint"
                    required
                >
                <p class="uk-text-meta uk-margin-remove-top">
                    If you forget your password, the password hint can be sent to your email. 0/50 character maximum.
                </p>
    
            </div>

            <div class="uk-margin">
                <button class="uk-button uk-button-primary uk-width-1-1">Create account</button>
            </div>
        </form>
    </section>
</div>


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
</style>
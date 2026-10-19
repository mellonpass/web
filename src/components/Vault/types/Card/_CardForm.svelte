<script lang="ts">
    import Icon from "@iconify/svelte";

    let { title = "Card Details", data = $bindable() } = $props();

    let toggleCardNumber = $state(false);
    let toggleSecurityCode = $state(false);

    function handleCardNumberInput() {
        const clean = (data.number || "").replace(/\D+/g, "");
        if (!data.brand && clean.length >= 2) {
            if (clean.startsWith("4")) data.brand = "Visa";
            else if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean))
                data.brand = "Mastercard";
            else if (/^3[47]/.test(clean)) data.brand = "American Express";
            else if (/^6(?:011|5)/.test(clean)) data.brand = "Discover";
            else if (/^35/.test(clean)) data.brand = "JCB";
        }
    }
</script>

<div class="space-y-4">
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
    </h3>

    <!-- Cardholder Name -->
    <div>
        <label
            for="cardholder-name"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Cardholder name
        </label>
        <input
            id="cardholder-name"
            type="text"
            aria-label="cardholder-name"
            placeholder="Name as it appears on card"
            bind:value={data.cardholderName}
            class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
    </div>

    <!-- Card Number -->
    <div>
        <label
            for="card-number"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Card number
        </label>
        <div class="relative mt-1.5">
            <Icon
                icon="hugeicons:credit-card"
                width="16"
                height="16"
                class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                id="card-number"
                type={toggleCardNumber ? "text" : "password"}
                aria-label="card-number"
                placeholder="0000 0000 0000 0000"
                bind:value={data.number}
                oninput={handleCardNumberInput}
                class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-9 pr-10 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
                type="button"
                aria-label="Toggle card number visibility"
                onclick={() => (toggleCardNumber = !toggleCardNumber)}
                class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
                <Icon
                    icon="hugeicons:{toggleCardNumber ? 'view-off-slash' : 'view'}"
                    width="18"
                    height="18"
                />
            </button>
        </div>
    </div>

    <!-- Brand -->
    <div>
        <label
            for="card-brand"
            class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
            Card network / brand
        </label>
        <select
            id="card-brand"
            bind:value={data.brand}
            class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
            <option value="">Select brand...</option>
            <option value="Visa">Visa</option>
            <option value="Mastercard">Mastercard</option>
            <option value="American Express">American Express</option>
            <option value="Discover">Discover</option>
            <option value="Diners Club">Diners Club</option>
            <option value="JCB">JCB</option>
            <option value="Maestro">Maestro</option>
            <option value="UnionPay">UnionPay</option>
            <option value="RuPay">RuPay</option>
            <option value="Other">Other</option>
        </select>
    </div>

    <!-- Expiration Month, Year & Security Code -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
            <label
                for="card-exp-month"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Exp. Month
            </label>
            <select
                id="card-exp-month"
                bind:value={data.expMonth}
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                <option value="">Month</option>
                <option value="01">01 - Jan</option>
                <option value="02">02 - Feb</option>
                <option value="03">03 - Mar</option>
                <option value="04">04 - Apr</option>
                <option value="05">05 - May</option>
                <option value="06">06 - Jun</option>
                <option value="07">07 - Jul</option>
                <option value="08">08 - Aug</option>
                <option value="09">09 - Sep</option>
                <option value="10">10 - Oct</option>
                <option value="11">11 - Nov</option>
                <option value="12">12 - Dec</option>
            </select>
        </div>

        <div>
            <label
                for="card-exp-year"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Exp. Year
            </label>
            <input
                id="card-exp-year"
                type="number"
                aria-label="card-exp-year"
                placeholder="2029"
                bind:value={data.expYear}
                class="mt-1.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
        </div>

        <div>
            <label
                for="card-cvv"
                class="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
                Security Code
            </label>
            <div class="relative mt-1.5">
                <input
                    id="card-cvv"
                    type={toggleSecurityCode ? "text" : "password"}
                    aria-label="card-csv"
                    placeholder="CVV"
                    bind:value={data.securityCode}
                    class="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 pl-3.5 pr-9 py-2.5 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button
                    type="button"
                    aria-label="Toggle CVV visibility"
                    onclick={() => (toggleSecurityCode = !toggleSecurityCode)}
                    class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                    <Icon
                        icon="hugeicons:{toggleSecurityCode ? 'view-off-slash' : 'view'}"
                        width="16"
                        height="16"
                    />
                </button>
            </div>
        </div>
    </div>
</div>
<script lang="ts">
    import type { VaultDetailTOTPField } from "$lib/models/data";

    let { fieldProps = $bindable() } = $props();

    // To enable field typing.
    const _field: VaultDetailTOTPField = fieldProps.field as VaultDetailTOTPField;

    const size = fieldProps.size ?? 24;
    const stroke = fieldProps.stroke ?? 1;
    const duration = 30;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    let timeLeft = $state(_field.getRemainingSeconds())
    let initialOffset = $state(0);

    let color = $derived.by(() => {
        return timeLeft > duration * 0.50 ? "#4caf50" :     // green  (66–100%)
                timeLeft > duration * 0.25 ? "#ffa833" :     // orange (33–66%)
                                 "#f44336";      // red    (0–33%)
    });

    $effect(() => {
        // compute only once when component starts or TOTP cycles.
        initialOffset = circumference * (1 - timeLeft / duration);
    });

    $effect(() => {
        // Countdown logic
        setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                timeLeft = 0;
                // Triggers re-render of this component with new TOTP value.
                fieldProps.displayValue = _field.displayValue()
            }
        }, 1000);
    });

</script>

<div class="wrapper" style="width:{size}px; height:{size}px;">
    <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
    >
        <!-- Background ring -->
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#eee"
            stroke-width={stroke}
            fill="none"
        />

        <!-- Animated countdown ring -->
        <circle
            class="progress"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            stroke-width={stroke}
            stroke-linecap="round"
            fill="none"
            stroke-dasharray={circumference}
            stroke-dashoffset={initialOffset}
            style={`--circ: ${circumference}; --duration: ${duration}s; --from: ${initialOffset};`}
        />
    </svg>

    <!-- Center number -->
    <div class="counter" style="color:{color}; font-size:{size * 0.4}px;">
        {timeLeft}
    </div>
</div>

<style>
    .wrapper {
        position: relative;
    }

    svg {
        position: absolute;
        top: 0;
        left: 0;
    }

    /* Number in center */
    .counter {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-weight: bold;
    }

    /* Countdown animation */
    .progress {
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
        animation: countdown var(--duration) linear forwards;
    }

    @keyframes countdown {
        from { stroke-dashoffset: var(--from); }
        to   { stroke-dashoffset: var(--circ); }
    }
</style>

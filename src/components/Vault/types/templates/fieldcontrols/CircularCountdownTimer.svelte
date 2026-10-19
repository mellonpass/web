<script lang="ts">
    import type { VaultDetailTOTPField } from "$lib/models/data";

    let { fieldProps = $bindable() } = $props();

    const _field: VaultDetailTOTPField =
        fieldProps.field as VaultDetailTOTPField;

    const size = fieldProps.size ?? 26;
    const stroke = fieldProps.stroke ?? 2.5;
    const duration = 30;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;

    let timeLeft = $state(_field.getRemainingSeconds());
    let initialOffset = $derived(circumference * (1 - timeLeft / duration));

    let color = $derived.by(() => {
        return timeLeft > duration * 0.5
            ? "#10b981" // emerald
            : timeLeft > duration * 0.2
              ? "#f59e0b" // amber
              : "#f43f5e"; // rose
    });

    $effect(() => {
        const interval = setInterval(() => {
            timeLeft = _field.getRemainingSeconds();
            fieldProps.displayValue = _field.displayValue();
        }, 1000);
        return () => clearInterval(interval);
    });
</script>

<div
    class="relative flex items-center justify-center select-none"
    style="width:{size}px; height:{size}px;"
    title="TOTP code refreshes in {timeLeft}s"
>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            class="text-slate-200 dark:text-slate-800"
            stroke-width={stroke}
            fill="none"
        />
        <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            stroke-width={stroke}
            stroke-linecap="round"
            fill="none"
            stroke-dasharray={circumference}
            stroke-dashoffset={initialOffset}
            style="transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 0.3s linear;"
        />
    </svg>

    <span
        class="font-mono font-bold leading-none"
        style="color:{color}; font-size:{size * 0.38}px;"
    >
        {timeLeft}
    </span>
</div>

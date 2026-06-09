"use client";

type QuantitySelectorProps = {
  qty: number;
  max: number;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (qty: number) => void;
};

export function QuantitySelector({ qty, max, decreaseLabel, increaseLabel, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="h-9 w-9 rounded-full border border-[#9595db]/45 text-lg font-semibold leading-none"
        aria-label={decreaseLabel}
      >
        −
      </button>
      <input
        type="number"
        min={1}
        max={max}
        value={qty}
        onChange={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (!Number.isNaN(v)) onChange(Math.min(max, Math.max(1, v)));
        }}
        onBlur={(e) => {
          const v = Number.parseInt(e.target.value, 10);
          if (Number.isNaN(v) || v < 1) onChange(1);
        }}
        className="h-9 w-14 rounded-xl border border-[#9595db]/45 px-2 text-center text-sm font-semibold outline-none focus:border-[#9595db]/55"
      />
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        className="h-9 w-9 rounded-full border border-[#9595db]/45 text-lg font-semibold leading-none"
        aria-label={increaseLabel}
      >
        +
      </button>
    </div>
  );
}

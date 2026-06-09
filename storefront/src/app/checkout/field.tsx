"use client";

export function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-[#2a2148]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className="w-full rounded-2xl border border-[#9595db]/35 px-3 py-2 text-sm outline-none disabled:bg-[#f2e6f7]"
      />
      {error && <p className="text-xs text-[#b00020]">{error}</p>}
    </div>
  );
}

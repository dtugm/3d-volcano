"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { DesignIcon, type IconName } from "./DesignIcon";

/** Solid card used for the side columns (no blur, no shadow inside the grid). */
export const panelClass = "rounded-[20px] bg-surface p-[18px]";
/** Card floating over the map. */
export const overlayCard = "rounded-2xl bg-surface shadow-[var(--site-float)]";
export const eyebrow = "text-[11px] font-semibold tracking-[0.4px] uppercase";

export function Panel({
  id,
  title,
  aside,
  children,
  className,
}: {
  id?: string;
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn(panelClass, className)}>
      {(title || aside) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[16px] font-bold text-ink">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** iOS-style switch (h-5 w-9) with a springy knob. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-brand" : "bg-mist",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          checked && "translate-x-4",
        )}
      />
    </button>
  );
}

/** Layer row: icon tile, label, switch. */
export function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon: IconName;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", disabled && "opacity-50")}>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-lg transition-colors duration-300",
          checked && !disabled ? "bg-brand-tint text-brand" : "bg-line text-subtle",
        )}
      >
        <DesignIcon name={icon} size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{label}</span>
        {hint && <span className="block truncate text-[11.5px] text-subtle">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "soft";

export function SiteButton({
  variant = "primary",
  size = "sm",
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: IconName;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-full whitespace-nowrap transition-[background-color,box-shadow,transform] duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45",
        size === "md" ? "h-12 gap-2.5 px-[22px] text-[15px]" : "h-[38px] gap-2 px-4 text-[13px] font-bold",
        variant === "primary" &&
          "bg-brand font-semibold text-white shadow-[0_8px_20px_-10px_var(--site-brand)] hover:bg-brand-hover",
        variant === "secondary" && "bg-surface text-ink hover:bg-brand-soft",
        variant === "soft" && "bg-line font-bold text-ink hover:bg-mist",
        className,
      )}
    >
      {icon && <DesignIcon name={icon} size={size === "md" ? 16 : 14} />}
      {children}
    </button>
  );
}

/** Pill chips in a grid; the active one is filled with the brand (or `accent`). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  accent,
  columns,
}: {
  value: T;
  options: { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  accent?: string;
  columns?: number;
}) {
  return (
    <div
      role="radiogroup"
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-8 truncate rounded-xl px-1.5 text-[11.5px] font-semibold transition-[background-color,color,transform] duration-300 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40",
              active ? "text-white" : "bg-line text-ink enabled:hover:bg-mist",
              active && !accent && "bg-brand",
            )}
            style={active && accent ? { background: accent } : undefined}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function FieldLabel({ label, aside }: { label: string; aside?: ReactNode }) {
  return (
    <div className="mt-3.5 mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      {aside !== undefined && (
        <span className="text-[12px] font-bold text-ink tabular-nums">{aside}</span>
      )}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  accent,
  label,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  accent?: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full cursor-ew-resize disabled:opacity-40"
      style={{ accentColor: accent ?? "var(--site-brand)" }}
    />
  );
}

export function Stat({
  label,
  value,
  color,
  wide,
}: {
  label: string;
  value: ReactNode;
  color?: string;
  wide?: boolean;
}) {
  return (
    <div className={cn("rounded-xl bg-canvas px-2.5 py-2", wide && "col-span-2")}>
      <div className="text-[10.5px] text-muted">{label}</div>
      <div className="mt-0.5 truncate text-[14px] font-extrabold text-ink tabular-nums" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function Bar({ share, color }: { share: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-mist">
      <div
        className="h-full rounded-full transition-[width] duration-300"
        style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, background: color ?? "var(--site-brand)" }}
      />
    </div>
  );
}

export function CloseButton({ onClick, label = "Tutup", className }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-full text-ink-body transition-[background-color,rotate] duration-300 hover:rotate-90 hover:bg-line",
        className,
      )}
    >
      <DesignIcon name="xSmall" size={14} />
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      className={cn("inline-block size-3.5 animate-spin rounded-full border-2 border-brand border-t-transparent", className)}
    />
  );
}

/** Small status pill (e.g. "Live", "ON", epoch code). */
export function Pill({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "amber" | "neutral" | "ok" }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] shrink-0 items-center rounded-full px-2 text-[10px] font-semibold whitespace-nowrap",
        tone === "brand" && "bg-brand-soft text-brand-deep",
        tone === "amber" && "bg-amber-soft text-amber",
        tone === "neutral" && "bg-chip text-chip-fg",
        tone === "ok" && "bg-[color-mix(in_srgb,var(--site-ok)_16%,transparent)] text-ok",
      )}
    >
      {children}
    </span>
  );
}

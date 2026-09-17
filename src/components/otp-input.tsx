"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

export function OtpInput({
  value,
  onChange,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function setDigit(i: number, char: string) {
    const clean = char.replace(/[^0-9]/g, "");
    const next = digits.slice();
    next[i] = clean.slice(-1) ?? "";
    onChange(next.join(""));
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted.padEnd(digits.length, "").slice(0, length));
    const focusIndex = Math.min(pasted.length, length - 1);
    refs.current[focusIndex]?.focus();
  }

  return (
    <div className="flex gap-2" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className={cn(
            "h-12 w-10 rounded-[var(--radius-md)] border border-border-strong bg-surface text-center text-lg font-medium text-ink transition-colors duration-150 sm:w-11",
            "focus-visible:outline-none focus-visible:border-ink focus-visible:ring-1 focus-visible:ring-ink",
            "disabled:bg-surface-muted disabled:text-ink-faint"
          )}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CaretUpDown, Check, Plus, Prohibit } from "@phosphor-icons/react/dist/ssr";
import { apiPost, ApiError } from "@/lib/fetch-json";
import { cn } from "@/lib/cn";

export type Membership = {
  companyId: string;
  companyName: string;
  companyStatus: "active" | "suspended";
  roleName: string;
};

export function CompanySwitcher({
  activeCompanyId,
  memberships,
}: {
  activeCompanyId: string;
  memberships: Membership[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = memberships.find((m) => m.companyId === activeCompanyId);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function switchTo(companyId: string) {
    if (companyId === activeCompanyId) return setOpen(false);
    setSwitching(true);
    try {
      await apiPost("/api/me/active-company", { companyId });
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal berpindah company.");
    } finally {
      setSwitching(false);
    }
  }

  function createNewCompany() {
    setOpen(false);
    router.push("/dashboard/companies/new");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors duration-150 hover:bg-surface cursor-pointer"
      >
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-ink text-[10px] font-semibold text-accent-contrast">
          {active?.companyName.slice(0, 1).toUpperCase()}
        </div>
        <span className="flex-1 truncate text-[13px] font-medium text-ink">{active?.companyName}</span>
        <CaretUpDown size={13} className="text-ink-faint" />
      </button>

      {open ? (
        <div className="absolute left-3 right-3 top-full z-20 mt-1 max-h-80 overflow-auto rounded-[var(--radius-md)] border border-border-strong bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)] fade-in" style={{ animationDuration: "140ms" }}>
          {memberships.map((m) => {
            const suspended = m.companyStatus === "suspended";
            return (
              <button
                key={m.companyId}
                disabled={suspended}
                onClick={() => switchTo(m.companyId)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors duration-150",
                  suspended ? "cursor-not-allowed text-ink-faint" : "text-ink hover:bg-surface-muted cursor-pointer"
                )}
              >
                <span className="flex-1 truncate">
                  {m.companyName}
                  <span className="ml-1.5 text-[11px] text-ink-faint">{m.roleName}</span>
                </span>
                {suspended ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-faint">
                    <Prohibit size={12} /> Nonaktif
                  </span>
                ) : m.companyId === activeCompanyId ? (
                  <Check size={14} />
                ) : null}
              </button>
            );
          })}
          <div className="my-1 border-t border-border" />
          <button
            onClick={createNewCompany}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink cursor-pointer"
          >
            <Plus size={13} weight="bold" />
            Buat Company Baru
          </button>
        </div>
      ) : null}
    </div>
  );
}

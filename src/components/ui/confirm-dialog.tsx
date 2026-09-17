"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Konfirmasi",
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)} disabled={loading}>
          Batal
        </Button>
        <Button variant={danger ? "danger" : "primary"} size="sm" onClick={handleConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}

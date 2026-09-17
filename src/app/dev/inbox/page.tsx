import { notFound } from "next/navigation";
import { getOutbox } from "@/lib/mailer";
import { Card } from "@/components/ui/card";

export default function DevInboxPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const mails = getOutbox();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-[20px] font-semibold tracking-tight text-ink">Dev Inbox</h1>
      <p className="mt-1 text-[13px] text-ink-muted">
        Belum ada penyedia email terpasang — semua email tercatat di sini (memori proses, hilang saat server
        restart).
      </p>

      <div className="mt-6 space-y-3">
        {mails.length === 0 ? (
          <Card>
            <div className="px-6 py-10 text-center text-[13px] text-ink-muted">Belum ada email terkirim.</div>
          </Card>
        ) : (
          mails.map((m) => (
            <Card key={m.id} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-ink">{m.subject}</p>
                <p className="text-[11px] text-ink-faint">{new Date(m.sentAt).toLocaleTimeString("id-ID")}</p>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-muted">to: {m.to}</p>
              <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink">{m.text}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

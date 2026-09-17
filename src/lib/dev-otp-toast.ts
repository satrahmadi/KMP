import { toast } from "sonner";

/** No email provider is wired up in this build — surface the OTP straight in the UI so the flow stays testable. */
export function showDevOtp(devCode?: string) {
  if (!devCode) return;
  toast(`Dev mode: kode OTP ${devCode}`, {
    description: "Belum ada penyedia email — kode ditampilkan di sini untuk keperluan uji coba.",
    duration: 15000,
  });
}

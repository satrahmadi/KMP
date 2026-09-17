import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KMP Console",
  description: "Auth, Company Onboarding & Team Management for the Knowledge Management Platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex items-start gap-2.5 rounded-[var(--radius-md)] border border-border-strong bg-surface px-4 py-3 text-[13px] text-ink shadow-[0_4px_16px_rgba(0,0,0,0.08)] w-[356px]",
              title: "font-medium text-ink",
              description: "text-ink-muted mt-0.5",
              actionButton: "!bg-ink !text-white !rounded-[4px] !px-2.5 !py-1 !text-[12px]",
              cancelButton: "!bg-surface-muted !text-ink !rounded-[4px] !px-2.5 !py-1 !text-[12px]",
              closeButton: "!bg-surface !border-border-strong !text-ink-muted",
              error: "!border-danger/30",
              success: "!border-ink/20",
            },
          }}
        />
      </body>
    </html>
  );
}

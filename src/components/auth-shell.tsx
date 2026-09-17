export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface-muted px-4 py-12">
      <div className="w-full max-w-[380px] fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-ink text-[13px] font-semibold text-accent-contrast">
            KM
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h1>
          {description ? <p className="mt-1.5 text-[13px] text-ink-muted">{description}</p> : null}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-6 py-7 sm:px-7">
          {children}
        </div>
        {footer ? <div className="mt-5 text-center text-[13px] text-ink-muted">{footer}</div> : null}
      </div>
    </div>
  );
}

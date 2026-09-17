import { AuthShell } from "@/components/auth-shell";
import { InviteFlow } from "./invite-flow";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <AuthShell title="Undangan bergabung">
      <InviteFlow token={token} />
    </AuthShell>
  );
}

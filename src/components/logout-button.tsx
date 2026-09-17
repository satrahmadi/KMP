"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/fetch-json";
import { cn } from "@/lib/cn";

export function LogoutButton({
  className,
  iconOnly,
  size = "md",
}: {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await apiPost("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      variant="secondary"
      size={size}
      onClick={logout}
      loading={loading}
      className={cn(className)}
      title="Keluar"
    >
      <SignOut size={15} />
      {iconOnly ? null : "Keluar"}
    </Button>
  );
}

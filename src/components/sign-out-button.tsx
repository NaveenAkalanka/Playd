"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export function SignOutButton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Sign out"
      onClick={async () => {
        await authClient.signOut();
        router.push("/auth/sign-in");
        router.refresh();
      }}
      className={className}
    >
      {children ?? <LogOut className="size-5" />}
    </button>
  );
}

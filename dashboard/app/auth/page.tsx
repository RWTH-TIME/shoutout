"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@helpwave/hightide";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (session) {
      router.replace("/");
    }
  }, [session, status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-black/10 p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Shoutout</h1>
        <p className="text-sm opacity-70">
          Sign in to create transcription jobs and manage API keys.
        </p>
        <Button color="primary" onClick={() => signIn("keycloak")}>
          Sign in
        </Button>
      </div>
    </div>
  );
}

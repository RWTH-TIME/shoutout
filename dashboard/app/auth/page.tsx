"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@helpwave/hightide";
import useAppTranslation from "../hooks/useAppTranslation";

function SignInContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const translation = useAppTranslation();

  const errorMessage = useMemo(() => {
    if (!error) {
      return null;
    }
    if (error === "OAuthSignin" || error === "OAuthCallback") {
      return translation("signInErrorReach");
    }
    return translation("signInErrorGeneric", { error });
  }, [error, translation]);

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
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-divider bg-surface p-8 text-on-surface shadow-sm">
        <h1 className="text-2xl font-semibold">{translation("signInTitle")}</h1>
        <p className="text-sm text-description">
          {translation("signInDescription")}
        </p>
        <p className="text-sm text-description">
          {translation("signInLocalHint")}
        </p>
        {errorMessage ? (
          <div className="rounded-lg border border-negative/30 bg-negative/10 p-3 text-sm text-negative">
            {errorMessage}
          </div>
        ) : null}
        <Button onClick={() => signIn("keycloak", { callbackUrl: "/" })}>
          {translation("signInButton")}
        </Button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const translation = useAppTranslation();

  return (
    <Suspense fallback={<div className="p-6">{translation("loading")}</div>}>
      <SignInContent />
    </Suspense>
  );
}

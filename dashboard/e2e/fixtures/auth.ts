import type { BrowserContext, Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

export const E2E_OWNER_ID = "11111111-1111-1111-1111-111111111111";
export const E2E_OWNER_EMAIL = "e2e-recording@example.com";
export const E2E_OWNER_NAME = "E2E Recorder";

export async function mintSessionToken(options?: {
  ownerId?: string;
  email?: string;
  name?: string;
}): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET ?? "e2e-recording-secret";
  return encode({
    token: {
      sub: options?.ownerId ?? E2E_OWNER_ID,
      email: options?.email ?? E2E_OWNER_EMAIL,
      name: options?.name ?? E2E_OWNER_NAME,
      picture: null,
    },
    secret,
  });
}

export async function applySessionCookie(
  context: BrowserContext,
  options?: {
    ownerId?: string;
    email?: string;
    name?: string;
    baseURL?: string;
  }
): Promise<void> {
  const token = await mintSessionToken(options);
  const baseURL = options?.baseURL ?? "http://127.0.0.1:3010";
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: url.protocol === "https:",
    },
  ]);
}

export async function loginAsE2EUser(page: Page): Promise<void> {
  await applySessionCookie(page.context());
  await page.goto("/");
  await page
    .getByRole("button", { name: "Record", exact: true })
    .or(page.getByRole("button", { name: "Aufnehmen", exact: true }))
    .waitFor({
      state: "visible",
      timeout: 30_000,
    });
}

import type { OAuthConfig } from "next-auth/providers/oauth";
import type { Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { AuthOptions } from "next-auth";
import env from "../../utility/environment/config";

type KeycloakProfile = Profile & {
  preferred_username?: string;
  picture?: string;
};

const publicIssuer = env.OIDC_PROVIDER.replace(/\/$/, "");
const internalIssuer = env.OIDC_INTERNAL_PROVIDER.replace(/\/$/, "");

function keycloakProvider(): OAuthConfig<KeycloakProfile> {
  return {
    id: "keycloak",
    name: "Keycloak",
    type: "oauth",
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET,
    issuer: publicIssuer,
    authorization: {
      url: `${publicIssuer}/protocol/openid-connect/auth`,
      params: { scope: "openid email profile" },
    },
    token: `${internalIssuer}/protocol/openid-connect/token`,
    userinfo: `${internalIssuer}/protocol/openid-connect/userinfo`,
    jwks_endpoint: `${internalIssuer}/protocol/openid-connect/certs`,
    checks: ["pkce", "state"],
    idToken: true,
    profile(profile) {
      return {
        id: profile.sub ?? profile.email ?? "unknown",
        name: profile.name ?? profile.preferred_username,
        email: profile.email,
        image: profile.picture,
      };
    },
  };
}

export const authOptions: AuthOptions = {
  providers: [keycloakProvider()],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.issuer = publicIssuer;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email;
        session.user.image =
          (token.picture as string | undefined) ?? session.user.image ?? null;
      }
      return session;
    },

    async jwt({ token, account, user, profile }) {
      if (account?.provider === "keycloak" && user) {
        token.sub = token.sub ?? user.id;
      }
      const keycloakProfile = profile as KeycloakProfile | undefined;
      if (keycloakProfile?.email) {
        token.email = keycloakProfile.email;
      } else if (user?.email) {
        token.email = user.email;
      }
      if (keycloakProfile?.picture) {
        token.picture = keycloakProfile.picture;
      } else if (user?.image) {
        token.picture = user.image;
      }
      return token;
    },
  },

  secret: env.NEXTAUTH_SECRET,
};

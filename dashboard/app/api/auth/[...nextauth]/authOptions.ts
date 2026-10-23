import KeycloakProvider from "next-auth/providers/keycloak";
import env from "../../utility/environment/config";
import { JWT } from "next-auth/jwt";
import { Account, Session, User } from "next-auth";

export const authOptions = {
  providers: [
    KeycloakProvider({
      clientId: env.OIDC_CLIENT_ID,
      clientSecret: env.OIDC_CLIENT_SECRET,
      issuer: env.OIDC_PROVIDER,
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.issuer = env.OIDC_PROVIDER;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email;
      }
      return session;
    },

    async jwt({
      token,
      account,
      user,
      profile,
    }: {
      token: JWT;
      account?: Account | null;
      user?: User;
      profile?: { email?: string };
    }) {
      if (account?.provider === "keycloak" && user) {
        token.sub = token.sub ?? user.id;
      }
      if (profile?.email) {
        token.email = profile.email;
      } else if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
  },

  secret: env.NEXTAUTH_SECRET,
};

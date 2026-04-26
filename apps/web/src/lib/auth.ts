import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { getDb } from "./db";
import { accounts, authenticators, sessions, users, verificationTokens } from "@/db/schema/auth";

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  );
}

const adapter = process.env.DATABASE_URL
  ? DrizzleAdapter(getDb(), {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
      authenticatorsTable: authenticators
    })
  : undefined;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  session: {
    strategy: "database"
  },
  providers,
  secret: process.env.AUTH_SECRET ?? process.env.INTERNAL_API_SECRET,
  pages: {
    signIn: "/"
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }

      return session;
    }
  }
});

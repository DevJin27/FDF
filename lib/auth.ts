import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";

import { AppError } from "@/lib/errors/app-error";
import { toSessionPayload } from "@/lib/http/response";
import {
  SESSION_MAX_AGE_SECONDS,
  issueSessionToken,
  verifySessionToken,
} from "@/lib/session-token";
import { authenticatePhoneOtp } from "@/lib/use-cases/auth";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  providers: [
    CredentialsProvider({
      name: "Phone OTP",
      credentials: {
        phone: {
          label: "Phone",
          type: "text",
        },
        otp: {
          label: "OTP",
          type: "text",
        },
      },
      async authorize(credentials) {
        try {
          const user = await authenticatePhoneOtp({
            phone: String(credentials?.phone ?? ""),
            otp: String(credentials?.otp ?? ""),
          });

          return toSessionPayload(user);
        } catch (error) {
          if (error instanceof AppError && error.statusCode < 500) {
            return null;
          }

          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.phone = user.phone;
        token.name = user.name;
        token.upiId = user.upiId;
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user ?? {}),
        id: String(token.id ?? token.sub ?? ""),
        phone: String(token.phone ?? ""),
        name: String(token.name ?? ""),
        upiId:
          token.upiId === null || typeof token.upiId === "string"
            ? token.upiId
            : null,
      };

      return session;
    },
  },
  jwt: {
    maxAge: SESSION_MAX_AGE_SECONDS,
    async encode({ token }) {
      if (
        !token?.sub ||
        typeof token.phone !== "string" ||
        typeof token.name !== "string"
      ) {
        throw new AppError(
          500,
          "Unable to encode session token",
          "SESSION_ENCODE_FAILED",
        );
      }

      return await issueSessionToken(
        {
          id: String(token.id ?? token.sub),
          phone: token.phone,
          name: token.name,
          upiId:
            token.upiId === null || typeof token.upiId === "string"
              ? token.upiId
              : null,
        },
        SESSION_MAX_AGE_SECONDS,
      );
    },
    async decode({ token }) {
      if (!token) {
        return null;
      }

      const payload = await verifySessionToken(token);

      if (!payload) {
        return null;
      }

      return {
        ...payload,
      } satisfies JWT;
    },
  },
};

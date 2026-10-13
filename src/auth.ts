import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { connectDB } from "@/lib/db";
import User, { type IUser } from "@/models/User";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();
        const account = await User.findOne<IUser>({
          email: String(credentials.email).toLowerCase(),
        }).lean<IUser & { _id: string } | null>();

        if (!account) {
          return null;
        }

        const isValid = await compare(String(credentials.password), account.password);

        if (!isValid) {
          return null;
        }

        const superAdminEmail = process.env.SUPER_ADMIN?.trim().toLowerCase();
        const isSuperAdmin = Boolean(superAdminEmail && account.email.toLowerCase() === superAdminEmail);
        if (!account.isApproved && !isSuperAdmin) {
          return null;
        }

        return {
          id: String(account._id),
          email: account.email,
          name: account.name,
          role: isSuperAdmin ? "admin" : account.role || "analyst",
          isApproved: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isApproved = user.isApproved;
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "analyst";
        session.user.isApproved = token.isApproved === true;
      }

      return session;
    },
  },
});

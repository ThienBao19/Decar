import type { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import EmailProvider from 'next-auth/providers/email'
import type { Adapter } from 'next-auth/adapters'
import { prisma } from './prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    EmailProvider({
      server: process.env.EMAIL_SERVER!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, user }) {
      // Attach subscription tier to session — re-fetched from DB on every session call
      const subscription = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { tier: true, status: true },
      })

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          tier: subscription?.tier ?? 'FREE',
          subscriptionStatus: subscription?.status ?? 'ACTIVE',
        },
      }
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.id) {
        // Auto-create FREE subscription on first sign-in
        await prisma.subscription.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            stripeCustomerId: `pending_${user.id}`,
            tier: 'FREE',
            status: 'ACTIVE',
          },
          update: {},
        })
      }
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

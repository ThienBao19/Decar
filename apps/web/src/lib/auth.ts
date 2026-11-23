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
      const [subscription, dbUser] = await Promise.all([
        prisma.subscription.findUnique({
          where: { userId: user.id },
          select: { tier: true, status: true },
        }),
        prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        }),
      ])

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          tier: subscription?.tier ?? 'FREE',
          subscriptionStatus: subscription?.status ?? 'ACTIVE',
          isAdmin: dbUser?.isAdmin ?? false,
        },
      }
    },
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser && user.id) {
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

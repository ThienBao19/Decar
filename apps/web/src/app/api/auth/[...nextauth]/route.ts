import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// next-auth v4 types the App Router handler as `any`; pin it to the route handler signature
type RouteHandler = (req: Request, ctx: { params: { nextauth: string[] } }) => Promise<Response>

const handler = NextAuth(authOptions) as RouteHandler

export { handler as GET, handler as POST }

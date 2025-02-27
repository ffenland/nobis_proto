'use server'

import { getIronSession } from 'iron-session'
import type { IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface SessionContent {
  id?: string
  role?: 'MEMBER' | 'TRAINER' | 'MANAGER'
  roleId?: string
}

const isSessionWithIdAndRole = (
  session: SessionContent
): session is SessionContent & { id: string; role: string; roleId: string } => {
  return (
    typeof session.id === 'string' &&
    (session.role === 'MEMBER' ||
      session.role === 'TRAINER' ||
      session.role === 'MANAGER') &&
    typeof session.roleId === 'string'
  )
}

export const getSession = async () => {
  const cookieStore = await cookies()

  return getIronSession<SessionContent>(cookieStore, {
    cookieName: 'nobisgym',
    password: process.env.COOKIE_PASSWORD!
  })
}

export const getSessionOrRedirect = async (): Promise<
  IronSession<SessionContent & { id: string; role: string; roleId: string }>
> => {
  // for server components
  const session = await getSession()

  if (isSessionWithIdAndRole(session)) {
    return session
  } else {
    return redirect('/')
  }
}

export const logoutSession = async () => {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}

export const logoutCurrentSession = async (
  session: IronSession<SessionContent>
) => {
  session.destroy()
  redirect('/login')
}

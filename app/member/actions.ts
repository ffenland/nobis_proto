'use server'
import { getSessionOrRedirect, logoutCurrentSession } from '@/app/lib/session'
import prisma from '@/app/lib/prisma'
import { redirect } from 'next/navigation'
import { Prisma } from '@prisma/client'
import { responseError } from '../lib/constants'

export type IMainMember = Prisma.PromiseReturnType<typeof getMemberInfo>

type MemberInfoSuccess = {
  ok: true
  data: {
    username: string
  }
}

type MemberInfoFailure = {
  ok: false
  code: string
  message: string
}

type MemberInfoResult = MemberInfoSuccess | MemberInfoFailure

export const getMemberInfo = async (): Promise<MemberInfoResult> => {
  // 로그인된 회원의 기초 정보를 받아온다.
  const session = await getSessionOrRedirect()
  if (session.role !== 'MEMBER')
    return {
      ok: false,
      code: responseError.sesseion.roleMismatch.code,
      message: responseError.sesseion.roleMismatch.message
    }
  const memberId = session.roleId
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      user: { select: { username: true } }
    }
  })
  if (!member) {
    // login session의 정보가 틀렸다면 로그아웃 처리
    logoutCurrentSession(session)
    return redirect('/login')
  }
  // user found
  return {
    ok: true,
    data: {
      username: member.user.username
    }
  }
}

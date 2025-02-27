'use server'

import prisma from '@/app/lib/prisma'
import { getSessionOrRedirect } from '@/app/lib/session'
import { redirect } from 'next/navigation'

export const getPtList = async () => {
  const session = await getSessionOrRedirect()
  if (session.role !== 'MEMBER') redirect('/')
  // session ok, user is member

  const ptList = await prisma.pt.findMany({
    where: {
      memberId: session.roleId
    },
    select: {
      id: true,
      ptProduct: {
        select: {
          title: true,
          time: true,
          price: true
        }
      },
      isActive: true,
      startDate: true,
      trainer: {
        select: {
          user: {
            select: {
              username: true
            }
          }
        }
      }
    }
  })
  return ptList
}

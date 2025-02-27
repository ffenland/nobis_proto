'use server'

import prisma from '@/app/lib/prisma'
import { loginToSession } from '@/app/lib/socialLogin'
import { createRandomNumber } from '@/app/lib/utils'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export const submitLogin = async (data: FormData) => {
  const roleId = data.get('id')
  const userId = data.get('userId')
  const rawUserRole = data.get('role')
  const userRole =
    rawUserRole === 'MANAGER'
      ? UserRole.MANAGER
      : rawUserRole === 'TRAINER'
        ? UserRole.TRAINER
        : UserRole.MEMBER

  if (userId && roleId && userRole) {
    await loginToSession(String(userId), userRole, String(roleId))
    if (userRole === UserRole.MANAGER) {
      redirect('/manager')
    } else if (userRole === UserRole.TRAINER) {
      redirect('/trainer')
    } else {
      redirect('/member')
    }
  }
}
export const getUserList = async () => {
  const memberList = await prisma.member.findMany({
    select: { id: true, user: { select: { username: true, id: true } } }
  })
  const trainerList = await prisma.trainer.findMany({
    select: { id: true, user: { select: { username: true, id: true } } }
  })
  const managerList = await prisma.manager.findMany({
    select: { id: true, user: { select: { username: true, id: true } } }
  })
  return { memberList, trainerList, managerList }
}

export const createRandomUser = async (data: FormData) => {
  let username = ''
  let exists: boolean = true
  let mobile = ''
  let mobileExists: boolean = true
  const rawUserRole = data.get('role')
  const userRole =
    rawUserRole === 'MANAGER'
      ? UserRole.MANAGER
      : rawUserRole === 'TRAINER'
        ? UserRole.TRAINER
        : UserRole.MEMBER
  while (exists) {
    username = createRandomNumber(6) + '@test'
    const user = await prisma.user.findFirst({
      where: { username },
      select: { id: true }
    })
    exists = user !== null
  }
  while (mobileExists) {
    mobile = '010' + createRandomNumber(8)
    const user = await prisma.user.findFirst({
      where: { mobile },
      select: { id: true }
    })
    mobileExists = user != null
  }
  const newUser = await prisma.user.create({
    data: {
      username,
      email: username + '@nobis.com',
      mobile,
      role: userRole
    }
  })
  let roleId = ''
  if (userRole === UserRole.MANAGER) {
    const creation = await prisma.manager.create({
      data: {
        user: { connect: { id: newUser.id } }
      },
      select: { id: true }
    })
    roleId = creation.id
  } else if (userRole === UserRole.TRAINER) {
    const creation = await prisma.trainer.create({
      data: {
        user: { connect: { id: newUser.id } }
      }
    })
    roleId = creation.id
  } else {
    const creation = await prisma.member.create({
      data: {
        user: { connect: { id: newUser.id } }
      }
    })
    roleId = creation.id
  }
  revalidatePath('/login')
}

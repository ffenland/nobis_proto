import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './app/lib/session'

interface Routes {
  [key: string]: boolean
}
const publicOnlyUrls: Routes = {
  '/login': true
}
// array보다 object가 요소를 검색하는데 더 빠르다.

const memberOnlyUrls: Routes = {}
const trainerOnlyUrls: Routes = {}
const managerOnlyUrls: Routes = {}

const middleware = async (request: NextRequest) => {
  const session = await getSession()
  // member, trainer, manager 각각의 페이지에 접근할 수 있는 url을 정의한다.

  const onPublicUrls = Boolean(
    publicOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith('/login')
  )
  const onMemberOnlyUrls = Boolean(
    memberOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith('/member')
  )
  const onTrainerOnlyUrls = Boolean(
    trainerOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith('/trainer')
  )
  const onManagerOnlyUrls = Boolean(
    managerOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith('/manager')
  )

  if (!session.id || !session.role) {
    // login하지 않은 상태
    if (!onPublicUrls) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // login 한 상태
    if (
      session.role === 'MEMBER' &&
      !request.nextUrl.pathname.startsWith('/member')
    ) {
      return NextResponse.redirect(new URL('/member', request.url))
    }
    if (
      session.role === 'TRAINER' &&
      !request.nextUrl.pathname.startsWith('/trainer')
    ) {
      return NextResponse.redirect(new URL('/trainer', request.url))
    }
    if (
      session.role === 'MANAGER' &&
      !request.nextUrl.pathname.startsWith('/manager')
    ) {
      return NextResponse.redirect(new URL('/manager', request.url))
    }
  }
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|favicon.ico).*)'
  ]
}

export default middleware

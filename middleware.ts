import { NextRequest, NextResponse } from "next/server";
import { getCurrentIronSession } from "./app/lib/session";

interface Routes {
  [key: string]: boolean;
}
const publicOnlyUrls: Routes = {
  "/login": true,
};
// array보다 object가 요소를 검색하는데 더 빠르다.

const memberOnlyUrls: Routes = {};
const trainerOnlyUrls: Routes = {};
const managerOnlyUrls: Routes = {};

const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_SIZE = 10 * 1000; // 10초
const MAX_REQUESTS = 100;

const middleware = async (request: NextRequest) => {
  const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
  const now = Date.now();

  const record = ipRequestCounts.get(ip);
  if (!record || now > record.resetAt) {
    // 첫 요청이거나 10초가 지났을 때
    ipRequestCounts.set(ip, { count: 1, resetAt: now + WINDOW_SIZE });
  } else {
    // 10초 안에 여러 번 요청했을 때
    if (record.count >= MAX_REQUESTS) {
      return new NextResponse("Too many requests", { status: 429 });
    }
    record.count += 1;
    ipRequestCounts.set(ip, record);
  }
  const session = await getCurrentIronSession();
  // member, trainer, manager 각각의 페이지에 접근할 수 있는 url을 정의한다.

  const onPublicUrls = Boolean(
    publicOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith("/login")
  );
  const onMemberOnlyUrls = Boolean(
    memberOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith("/member")
  );
  const onTrainerOnlyUrls = Boolean(
    trainerOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith("/trainer")
  );
  const onManagerOnlyUrls = Boolean(
    managerOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith("/manager")
  );
  // /login 페이지에서는 리다이렉트하지 않음
  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  if (!session.id || !session.role) {
    // login하지 않은 상태
    if (!onPublicUrls) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } else {
    // login 한 상태

    if (
      session.role === "MEMBER" &&
      !request.nextUrl.pathname.startsWith("/member")
    ) {
      return NextResponse.redirect(new URL("/member", request.url));
    }
    if (
      session.role === "TRAINER" &&
      !request.nextUrl.pathname.startsWith("/trainer")
    ) {
      return NextResponse.redirect(new URL("/trainer", request.url));
    }
    if (
      session.role === "MANAGER" &&
      !request.nextUrl.pathname.startsWith("/manager")
    ) {
      return NextResponse.redirect(new URL("/manager", request.url));
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|.*\\.jpg$|favicon.ico).*)",
  ],
};

export default middleware;

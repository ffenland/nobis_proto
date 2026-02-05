import { NextRequest, NextResponse } from "next/server";
import { getCurrentIronSession } from "./app/lib/session";

interface Routes {
  [key: string]: boolean;
}
const publicOnlyUrls: Routes = {
  "/login": true,
  "/ffen": true,
};

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

  const onPublicUrls = Boolean(
    publicOnlyUrls[request.nextUrl.pathname] ||
      request.nextUrl.pathname.startsWith("/login")
  );
  // /login 페이지 처리
  if (request.nextUrl.pathname === "/login") {
    // 이미 로그인한 경우 해당 role 페이지로 리다이렉트
    if (session.id && session.role) {
      if (session.role === "MEMBER") {
        return NextResponse.redirect(new URL("/member", request.url));
      } else if (session.role === "TRAINER") {
        return NextResponse.redirect(new URL("/trainer", request.url));
      } else if (session.role === "MANAGER") {
        return NextResponse.redirect(new URL("/manager", request.url));
      } else if (session.role === "MASTER") {
        return NextResponse.redirect(new URL("/master", request.url));
      }
    }
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
    if (session.role === "MASTER") {
      // MASTER는 /master와 /manager 모두 접근 가능
      const isOnMasterOrManagerRoute =
        request.nextUrl.pathname.startsWith("/master") ||
        request.nextUrl.pathname.startsWith("/manager");
      if (!isOnMasterOrManagerRoute) {
        return NextResponse.redirect(new URL("/master", request.url));
      }
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

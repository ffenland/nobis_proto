import { createRandomNumber } from "./utils";
import prisma from "./prisma";
import { getCurrentIronSession } from "./session";
import { redirect } from "next/navigation";
import { setSentryUser } from "./utils/sentry-session";

interface NaverAccessTokenResponseSuccess {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: string;
}

interface KakaoAccessTokenResponseSuccess {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_token_expires_in: number;
  scope?: string;
}

export const loginToSession = async (
  id: string,
  role: "MEMBER" | "TRAINER" | "MANAGER",
  roleId: string
) => {
  const session = await getCurrentIronSession();
  session.id = id;
  session.role = role;
  session.roleId = roleId;
  await session.save();

  // Sentry에 사용자 정보 설정
  try {
    // 사용자 정보 조회
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (user) {
      // 센터 정보 조회 (트레이너/매니저의 경우)
      let centerId: string | undefined;
      if (role === "TRAINER") {
        const trainer = await prisma.trainer.findUnique({
          where: { id: roleId },
          select: { fitnessCenterId: true },
        });
        centerId = trainer?.fitnessCenterId ?? undefined;
      } else if (role === "MANAGER") {
        const manager = await prisma.manager.findUnique({
          where: { id: roleId },
          select: { fitnessCenterId: true },
        });
        centerId = manager?.fitnessCenterId ?? undefined;
      }

      setSentryUser({
        id: user.id,
        email: user.email || undefined,
        username: user.username,
        role,
        roleId,
        centerId,
      });
    }
  } catch (error) {
    // Sentry 설정 실패는 로그인을 막지 않음
    console.error("Failed to set Sentry user context:", error);
  }
};

export const createRandomUsername = async (
  social: "naver" | "kakao"
): Promise<string> => {
  let username = "";
  let exists: boolean = true;
  if (social === "kakao") {
    while (exists) {
      username = createRandomNumber(6) + "@k";
      const user = await prisma.user.findFirst({
        where: { username },
        select: { id: true },
      });
      exists = user !== null;
    }
  } else {
    while (exists) {
      username = createRandomNumber(6) + "@n";
      const user = await prisma.user.findFirst({
        where: { username },
        select: { id: true },
      });
      exists = user !== null;
    }
  }

  return username;
};

export const naverLogin = async (code: string) => {
  const accessTokenBaseURL = "https://nid.naver.com/oauth2.0/token";
  const accessTokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: process.env.NAVER_CLIENT_ID!,
    client_secret: process.env.NAVER_CLIENT_SECRET!,
    code,
    state: process.env.NAVER_STATE!,
  }).toString();
  const accessTokenURL = `${accessTokenBaseURL}?${accessTokenParams}`;
  const accessTokenData = await (
    await fetch(accessTokenURL, { method: "POST" })
  ).json();
  // AccessToken을 가져왔는가 못가져왔는가
  if (accessTokenData.access_token) {
    const successTokenData: NaverAccessTokenResponseSuccess = accessTokenData;
    const naverProfileURL = "https://openapi.naver.com/v1/nid/me";
    const userProfileResponse = await (
      await fetch(naverProfileURL, {
        method: "POST",
        headers: {
          Authorization: `${successTokenData.token_type} ${successTokenData.access_token}`,
        },
      })
    ).json();
    if (userProfileResponse.response.id) {
      // success

      const naverId: string = userProfileResponse.response.id;
      const email: string = userProfileResponse.response.email;
      const mobileWithHyphens: string = userProfileResponse.response.mobile;
      const mobile = mobileWithHyphens.replace(/-/g, "");

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          role: true,
          naverId: true,
          managerProfile: { select: { id: true } },
          trainerProfile: { select: { id: true } },
          memberProfile: { select: { id: true } },
        },
      });
      if (user && user.naverId === naverId) {
        // 기존에 네이버로 로그인했던 이력이 있는 회원
        if (user.role === "MANAGER" && user.managerProfile) {
          await loginToSession(user.id, user.role, user.managerProfile.id);
          return redirect("/manager");
        } else if (user.role === "TRAINER" && user.trainerProfile) {
          await loginToSession(user.id, user.role, user.trainerProfile.id);
          return redirect("/trainer");
        } else if (user.role === "MEMBER" && user.memberProfile) {
          await loginToSession(user.id, user.role, user.memberProfile.id);
          return redirect("/member");
        } else {
          // role이 없는 회원 = 회원가입이 제대로 안된 회원
          return redirect("/");
        }
      } else if (user && user.naverId !== naverId) {
        // email은 등록되어 있으나 네이버로 로그인하지 않았던 회원 = 카카오 회원
        // 나중엔 이중연동 작업을 해주자.
        return redirect("/login?error=alreadykakao");
      } else if (user && user.naverId === null) {
        // 이메일은 있지만 naverId가 없는 경우 naverId 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { naverId },
        });
        if (user.role === "MANAGER" && user.managerProfile) {
          await loginToSession(user.id, user.role, user.managerProfile.id);
          return redirect("/manager");
        } else if (user.role === "TRAINER" && user.trainerProfile) {
          await loginToSession(user.id, user.role, user.trainerProfile.id);
          return redirect("/trainer");
        } else if (user.role === "MEMBER" && user.memberProfile) {
          await loginToSession(user.id, user.role, user.memberProfile.id);
          return redirect("/member");
        } else {
          // role이 없는 경우
          return redirect("/");
        }
      } else {
        // signup
        const username = await createRandomUsername("naver");
        const newUser = await prisma.$transaction(async (trPrisma) => {
          const newUser = await trPrisma.user.create({
            data: {
              email,
              naverId,
              username,
              mobile,
              role: "MEMBER",
            },
            select: {
              id: true,
              role: true,
            },
          });
          const newMember = await trPrisma.member.create({
            data: {
              user: { connect: { id: newUser.id } },
            },
            select: { id: true },
          });
          await trPrisma.userData.create({
            data: {
              user: { connect: { id: newUser.id } },
            },
          });
          return { id: newUser.id, role: newUser.role, memberId: newMember.id };
        });
        await loginToSession(newUser.id, newUser.role, newUser.memberId);
        return redirect("/member");
      }
    } else {
      // 네이버 회원정보 가져오다가 에러남
      return redirect("/login?error=failnaver");
    }
  } else {
    return redirect("/login?error=failnavertoken");
  }
  // 예상치 못한 경우를 위한 fallback
  return redirect("/login?error=unexpected");
};

export const kakaoLogin = async (code: string) => {
  const accessTokenURL = "https://kauth.kakao.com/oauth/token";
  const accessTokenData = await (
    await fetch(accessTokenURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_REST_API_KEY!,
        client_secret: process.env.KAKAO_CLIENT_SECRET!,
        redirect_uri: process.env.KAKAO_REDIRECT_URI!,
        code,
      }).toString(),
    })
  ).json();

  // AccessToken을 가져왔는가 못가져왔는가
  if (accessTokenData.access_token) {
    const successTokenData: KakaoAccessTokenResponseSuccess = accessTokenData;
    const kakaoUserInfoURL = "https://kapi.kakao.com/v2/user/me";
    const userProfileResponse = await (
      await fetch(kakaoUserInfoURL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${successTokenData.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      })
    ).json();

    if (userProfileResponse.id) {
      // success
      const kakaoId: string = userProfileResponse.id.toString();
      const kakaoAccount = userProfileResponse.kakao_account;
      const email: string = kakaoAccount.email;
      
      // 카카오는 전화번호를 기본적으로 제공하지 않음
      const mobile = "";

      const user = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          role: true,
          kakaoId: true,
          managerProfile: { select: { id: true } },
          trainerProfile: { select: { id: true } },
          memberProfile: { select: { id: true } },
        },
      });

      if (user && user.kakaoId === kakaoId) {
        // 기존에 카카오로 로그인했던 이력이 있는 회원
        if (user.role === "MANAGER" && user.managerProfile) {
          await loginToSession(user.id, user.role, user.managerProfile.id);
          return redirect("/manager");
        } else if (user.role === "TRAINER" && user.trainerProfile) {
          await loginToSession(user.id, user.role, user.trainerProfile.id);
          return redirect("/trainer");
        } else if (user.role === "MEMBER" && user.memberProfile) {
          await loginToSession(user.id, user.role, user.memberProfile.id);
          return redirect("/member");
        } else {
          // role이 없는 회원 = 회원가입이 제대로 안된 회원
          return redirect("/");
        }
      } else if (user && user.kakaoId !== kakaoId) {
        // email은 등록되어 있으나 카카오로 로그인하지 않았던 회원 = 네이버 회원
        // 나중엔 이중연동 작업을 해주자.
        return redirect("/login?error=alreadynaver");
      } else if (user && user.kakaoId === null) {
        // 이메일은 있지만 kakaoId가 없는 경우 kakaoId 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { kakaoId },
        });
        if (user.role === "MANAGER" && user.managerProfile) {
          await loginToSession(user.id, user.role, user.managerProfile.id);
          return redirect("/manager");
        } else if (user.role === "TRAINER" && user.trainerProfile) {
          await loginToSession(user.id, user.role, user.trainerProfile.id);
          return redirect("/trainer");
        } else if (user.role === "MEMBER" && user.memberProfile) {
          await loginToSession(user.id, user.role, user.memberProfile.id);
          return redirect("/member");
        } else {
          // role이 없는 경우
          return redirect("/");
        }
      } else {
        // signup
        const username = await createRandomUsername("kakao");
        const newUser = await prisma.$transaction(async (trPrisma) => {
          const newUser = await trPrisma.user.create({
            data: {
              email,
              kakaoId,
              username,
              mobile,
              role: "MEMBER",
            },
            select: {
              id: true,
              role: true,
            },
          });
          const newMember = await trPrisma.member.create({
            data: {
              user: { connect: { id: newUser.id } },
            },
            select: { id: true },
          });
          await trPrisma.userData.create({
            data: {
              user: { connect: { id: newUser.id } },
            },
          });
          return { id: newUser.id, role: newUser.role, memberId: newMember.id };
        });
        await loginToSession(newUser.id, newUser.role, newUser.memberId);
        return redirect("/member");
      }
    } else {
      // 카카오 회원정보 가져오다가 에러남
      return redirect("/login?error=failkakao");
    }
  } else {
    return redirect("/login?error=failkakaotoken");
  }
  // 예상치 못한 경우를 위한 fallback
  return redirect("/login?error=unexpected");
};

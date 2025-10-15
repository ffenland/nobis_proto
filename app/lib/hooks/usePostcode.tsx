"use client";

import { useState } from "react";
import Script from "next/script";

// Daum Postcode API 타입 정의
declare global {
  interface Window {
    daum: {
      Postcode: new (options: DaumPostcodeOptions) => DaumPostcodeInstance;
    };
  }
}

// Daum Postcode 생성자 옵션 타입
interface DaumPostcodeOptions {
  // 필수 콜백 함수들
  oncomplete?: (data: DaumPostcodeData) => void;
  onresize?: (size: { width: number; height: number }) => void;
  onclose?: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void;
  onsearch?: (data: { q: string; count: number }) => void;

  // 크기 관련 옵션
  minWidth?: number;
  width?: number | string;
  height?: number | string;

  // UI/UX 옵션
  animation?: boolean;
  focusInput?: boolean;

  // 매핑 관련 옵션
  autoMapping?: boolean;
  autoMappingRoad?: boolean;
  autoMappingJibun?: boolean;

  // 주소 표시 관련 옵션
  shorthand?: boolean;
  showMoreHName?: boolean;
  alwaysShowEngAddr?: boolean;

  // 가이드 관련 옵션
  pleaseReadGuide?: number;
  pleaseReadGuideTimer?: number;
  maxSuggestItems?: number;

  // 버튼 숨김 옵션
  hideMapBtn?: boolean;
  hideEngBtn?: boolean;

  // 기타 옵션
  submitMode?: boolean;
  useBannerLink?: boolean;

  // 테마 옵션
  theme?: {
    searchBgColor?: string;
    queryTextColor?: string;
    [key: string]: string | undefined;
  };
}

// Postcode 인스턴스 타입
interface DaumPostcodeInstance {
  open: (options?: DaumPostcodeOpenOptions) => void;
  embed: (element: HTMLElement, options?: DaumPostcodeEmbedOptions) => void;
}

// open() 함수 옵션 타입
interface DaumPostcodeOpenOptions {
  q?: string;           // 검색어 (바로 검색 실행)
  left?: number;        // 팝업 위치 x값
  top?: number;         // 팝업 위치 y값
  popupTitle?: string;  // 팝업창의 타이틀
  popupKey?: string;    // 팝업창 구분값 (여러 팝업 방지)
  autoClose?: boolean;  // 자동 닫힘 유무 (기본값: true)
}

// embed() 함수 옵션 타입
interface DaumPostcodeEmbedOptions {
  q?: string;          // 검색어 (바로 검색 실행)
  autoClose?: boolean; // 자동 닫힘 유무 (기본값: true)
}

// oncomplete 콜백의 data 타입
interface DaumPostcodeData {
  // 기본 정보
  zonecode: string;              // 국가기초구역번호 (새 우편번호)
  address: string;               // 기본 주소
  addressEnglish: string;        // 기본 영문 주소
  addressType: 'R' | 'J';        // 검색된 기본 주소 타입: R(도로명), J(지번)
  userSelectedType: 'R' | 'J';   // 사용자가 선택한 주소의 타입
  noSelected: 'Y' | 'N';         // 연관 주소에서 "선택 안함" 선택 여부
  userLanguageType: 'K' | 'E';   // 사용자가 선택한 주소의 언어 타입

  // 도로명 주소
  roadAddress: string;           // 도로명 주소
  roadAddressEnglish: string;    // 영문 도로명 주소
  autoRoadAddress: string;       // 자동 매핑된 도로명 주소
  autoRoadAddressEnglish: string; // 자동 매핑된 영문 도로명 주소

  // 지번 주소
  jibunAddress: string;          // 지번 주소
  jibunAddressEnglish: string;   // 영문 지번 주소
  autoJibunAddress: string;      // 자동 매핑된 지번 주소
  autoJibunAddressEnglish: string; // 자동 매핑된 영문 지번 주소

  // 건물 정보
  buildingCode: string;          // 건물관리번호
  buildingName: string;          // 건물명
  apartment: 'Y' | 'N';          // 공동주택 여부

  // 지역 정보
  sido: string;                  // 도/시 이름
  sidoEnglish: string;          // 도/시 이름의 영문
  sigungu: string;              // 시/군/구 이름
  sigunguEnglish: string;       // 시/군/구 이름의 영문
  sigunguCode: string;          // 시/군/구 코드

  // 도로명 정보
  roadnameCode: string;         // 도로명 코드
  roadname: string;             // 도로명
  roadnameEnglish: string;      // 도로명 영문

  // 법정동 정보
  bcode: string;                // 법정동/법정리 코드
  bname: string;                // 법정동/법정리 이름
  bnameEnglish: string;         // 법정동/법정리 이름의 영문
  bname1: string;               // 법정리의 읍/면 이름
  bname1English: string;        // 법정리의 읍/면 이름의 영문
  bname2: string;               // 법정동/법정리 이름
  bname2English: string;        // 법정동/법정리 이름의 영문

  // 행정동 정보
  hname: string;                // 행정동 이름

  // 검색 관련
  query: string;                // 사용자가 입력한 검색어

  // 구 우편번호 (2020년 3월 9일 이후 사용 안함)
  postcode: string;             // 구 우편번호
  postcode1: string;            // 구 우편번호 앞 3자리
  postcode2: string;            // 구 우편번호 뒤 3자리
  postcodeSeq: string;          // 구 우편번호 일련번호
}

// 주소 데이터 타입
export interface AddressData {
  address: string;
  postCode: string;
  extraAddress?: string; // 참고항목 (건물명, 법정동명 등)
}

// usePostcode 훅 옵션 타입
export interface UsePostcodeOptions {
  // 팝업 크기
  width?: number;
  height?: number;

  // 팝업 위치 (기본값: 화면 중앙)
  position?: 'center' | 'custom';
  left?: number;
  top?: number;

  // 팝업 설정
  popupTitle?: string;
  popupKey?: string;

  // UI 옵션
  animation?: boolean;
  focusInput?: boolean;
  autoMapping?: boolean;
  shorthand?: boolean;
  includeExtraAddress?: boolean; // 참고항목 포함 여부

  // 초기 검색어
  initialQuery?: string;

  // 콜백 함수들
  onComplete?: (data: DaumPostcodeData) => void;
  onClose?: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void;
  onSearch?: (data: { q: string; count: number }) => void;
  onResize?: (size: { width: number; height: number }) => void;
}

// usePostcode 훅
export function usePostcode(options?: UsePostcodeOptions) {
  const [isReady, setIsReady] = useState(false);
  const [addressData, setAddressData] = useState<AddressData>({
    address: "",
    postCode: "",
    extraAddress: "",
  });

  // 기본 옵션
  const defaultOptions: UsePostcodeOptions = {
    width: 500,
    height: 600,
    position: 'center',
    popupTitle: '주소 검색',
    popupKey: 'daumPostcodeSearch',
    animation: true,
    focusInput: true,
    autoMapping: true,
    shorthand: true,
    includeExtraAddress: false,
    ...options,
  };

  // 공통 완료 처리 함수
  const handleComplete = (data: DaumPostcodeData) => {
    let addr = '';
    let extraAddr = '';

    // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다
    if (data.userSelectedType === 'R') {
      addr = data.roadAddress;
    } else {
      addr = data.jibunAddress;
    }

    // 참고항목 처리 (도로명 타입일 때만)
    if (defaultOptions.includeExtraAddress && data.userSelectedType === 'R') {
      // 법정동명이 있을 경우 추가 (법정리는 제외)
      if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
        extraAddr += data.bname;
      }
      // 건물명이 있고, 공동주택일 경우 추가
      if (data.buildingName !== '' && data.apartment === 'Y') {
        extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
      }
      // 표시할 참고항목이 있을 경우, 괄호까지 추가
      if (extraAddr !== '') {
        extraAddr = ' (' + extraAddr + ')';
      }
    }

    const newAddressData: AddressData = {
      address: addr,
      postCode: data.zonecode,
      extraAddress: extraAddr,
    };

    setAddressData(newAddressData);

    // 사용자 정의 콜백 실행
    if (defaultOptions.onComplete) {
      defaultOptions.onComplete(data);
    }
  };

  // 팝업 모드로 주소 검색 열기
  const openPopup = () => {
    const postcode = new window.daum.Postcode({
      oncomplete: handleComplete,
      onclose: defaultOptions.onClose,
      onsearch: defaultOptions.onSearch,
      onresize: defaultOptions.onResize,

      // UI 설정
      width: defaultOptions.width,
      height: defaultOptions.height,
      animation: defaultOptions.animation,
      focusInput: defaultOptions.focusInput,
      autoMapping: defaultOptions.autoMapping,
      shorthand: defaultOptions.shorthand,
    });

    // 팝업 위치 계산
    const openOptions: DaumPostcodeOpenOptions = {
      popupTitle: defaultOptions.popupTitle,
      popupKey: defaultOptions.popupKey,
      autoClose: true,
    };

    if (defaultOptions.initialQuery) {
      openOptions.q = defaultOptions.initialQuery;
    }

    if (defaultOptions.position === 'center') {
      const width = defaultOptions.width || 500;
      const height = defaultOptions.height || 600;
      openOptions.left = (window.screen.width / 2) - (width / 2);
      openOptions.top = (window.screen.height / 2) - (height / 2);
    } else if (defaultOptions.position === 'custom') {
      openOptions.left = defaultOptions.left;
      openOptions.top = defaultOptions.top;
    }

    postcode.open(openOptions);
  };

  // 주소 검색 함수
  const openPostcode = () => {
    if (!window.daum) {
      console.error('window.daum is not available');
      return;
    }

    if (!isReady) {
      console.error('Postcode API is not ready');
      return;
    }

    openPopup();
  };

  // 주소 데이터 초기화
  const resetAddress = () => {
    setAddressData({
      address: "",
      postCode: "",
      extraAddress: "",
    });
  };

  // 주소 데이터 수동 설정
  const setAddress = (data: AddressData) => {
    setAddressData(data);
  };

  return {
    // 상태
    isReady,
    addressData,

    // 액션
    openPostcode,
    resetAddress,
    setAddress,

    // 스크립트 컴포넌트
    PostcodeScript: () => (
      <Script
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        onLoad={() => setIsReady(true)}
      />
    ),
  };
}

export default usePostcode;
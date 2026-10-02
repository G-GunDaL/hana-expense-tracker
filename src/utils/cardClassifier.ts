import { CardCategory } from '../types/finance';

export const CARD_CATEGORIES: CardCategory[] = [
  '교육/학원',
  '주거/공과금',
  '통신비',
  '생활렌탈/구독',
  '교통/택시',
  '통행료/하이패스',
  '차량/주유/정비',
  '온라인쇼핑',
  '마트/편의점',
  '배달음식',
  '카페/베이커리',
  '외식/식당',
  '문화/여행/여가',
  '의료/건강',
  '뷰티/생활서비스',
  '금융/연회비',
  '기타소비'
];

export const CARD_CATEGORY_COLORS: Record<string, string> = {
  '교육/학원': '#ec4899', // 핑크
  '주거/공과금': '#f59e0b', // 앰버
  '통신비': '#06b6d4', // 시안
  '생활렌탈/구독': '#8b5cf6', // 퍼플
  '교통/택시': '#3b82f6', // 블루
  '통행료/하이패스': '#6366f1', // 인디고
  '차량/주유/정비': '#14b8a6', // 틸
  '온라인쇼핑': '#e60050', // 하나 레드
  '마트/편의점': '#10b981', // 에메랄드
  '배달음식': '#f97316', // 오렌지
  '카페/베이커리': '#d97706', // 브라운 골드
  '외식/식당': '#ef4444', // 레드
  '문화/여행/여가': '#a855f7', // 바이올렛
  '의료/건강': '#008485', // 하나 틸
  '뷰티/생활서비스': '#f43f5e', // 로즈
  '금융/연회비': '#64748b', // 슬레이트
  '기타소비': '#94a3b8'
};

/**
 * 현대카드 8대 정밀 가맹점 분류 엔진 (Rule-based Exact Matching)
 * 2,200여 건 실제 가맹점 전수 분석 결과 적용
 */
export function classifyMerchant(merchant: string, cardName: string = ''): CardCategory {
  const m = (merchant || '').trim();

  // 1. 교육 / 자녀 학원 (고액 정기 변동지출)
  if (/학원|태권도|영어수학|요가|센트럴영어|한신태권도|JK제이케이|트리코나/.test(m)) {
    return '교육/학원';
  }

  // 2. 주거 / 공과금 / 통신 / 렌탈 (카드 고정지출)
  if (/아파트관리비|도시가스|충청에너지|지방세|대법원|우체국|여수시청/.test(m)) {
    return '주거/공과금';
  }
  if (/LG유플러스|LGU\+|통신요|통신요금/.test(m)) {
    return '통신비';
  }
  if (/쿠쿠홈시스|렌탈/.test(m)) {
    return '생활렌탈/구독';
  }

  // 3. 교통 / 차량 / 주유 / 이동
  if (/택시|카카오T|이동의즐거움|대중교통|충북버스|티머니|시외버스/.test(m)) {
    return '교통/택시';
  }
  if (/하이패스|고속도로|한국도로공사|울산하버브릿지|상주영천|옥산오창|제이서해안/.test(m)) {
    return '통행료/하이패스';
  }
  if (/주유소|에너지뱅크|티스테이션|한국지엠|오토엠|세차|주차/.test(m)) {
    return '차량/주유/정비';
  }

  // 4. 온라인 쇼핑 / 이커머스
  if (/쿠팡|쿠팡페이|네이버페이|네이버파이낸셜|번개장터|에이블리|하고|G마켓|옥션|롯데홈쇼핑|현대홈쇼핑|Apple|러브썸원|에이피알|어센트원|다우데이타|섹타나인|갤럭시아|스마트로/.test(m)) {
    return '온라인쇼핑';
  }

  // 5. 마트 / 편의점 / 식료품
  if (/씨유|CU|세븐일레븐|GS25|이마트24|홈플러스|다이소|청과|과일|수산|마트|장터|리퍼브|응응스크르|아이스꽁꽁/.test(m)) {
    return '마트/편의점';
  }

  // 6. 외식 / 배달 / 카페 / 베이커리
  if (/우아한형제들|배달의민족|요기요|쿠팡이츠/.test(m)) {
    return '배달음식';
  }
  if (/커피|카페|스타벅스|메가|이디야|컴포즈|투썸|설빙|뚜레쥬르|파리바게뜨|베이커리|도너킹|만두|찐빵|떡방|빵/.test(m)) {
    return '카페/베이커리';
  }
  if (/식당|갈비|횟집|한우|샤브|고기|막국수|부대찌개|조개구이|아구찜|치킨|BHC|또래오래|맥주|감자탕|유생촌|고메스퀘어|뷔페|푸드|음식점|FIVE GUYS|PANDA EXPRESS|BUFFE/.test(m)) {
    return '외식/식당';
  }

  // 7. 문화 / 여가 / 여행 / 숙박
  if (/리조트|호텔|소노인터내셔널|벨메르|곤지암|에버랜드|메가박스|유람선|보트|캠핑|사우나/.test(m)) {
    return '문화/여행/여가';
  }

  // 8. 의료 / 건강 / 뷰티 / 생활서비스
  if (/병원|의원|약국|치과|정신건강|비뇨기과|정형외과|산부인과|안경|다비치/.test(m)) {
    return '의료/건강';
  }
  if (/헤어|미용실|크린토피아|세탁/.test(m)) {
    return '뷰티/생활서비스';
  }
  if (/연회비|이자|수수료/.test(m)) {
    return '금융/연회비';
  }

  return '기타소비';
}

/**
 * 카드 소유자 구분 (본인 vs 가족)
 * 예: '가족 X BOOST', '가족카드' 등 '가족' 키워드 포함 시 가족 카드
 */
export function classifyCardOwner(cardName: string): '본인' | '가족' {
  const c = (cardName || '').trim();
  if (c.includes('가족')) {
    return '가족';
  }
  return '본인';
}

/**
 * 고정성 카드 지출 여부 자동 판별
 * 관리비, 통신비, 도시가스, 생활렌탈, 학원비 등
 */
export function isFixedCardExpense(merchant: string, category: string): boolean {
  if (
    category === '주거/공과금' ||
    category === '통신비' ||
    category === '생활렌탈/구독' ||
    category === '교육/학원'
  ) {
    return true;
  }
  const m = merchant.trim();
  return /아파트관리비|도시가스|통신요금|LGU\+|쿠쿠홈시스|학원/.test(m);
}

/**
 * 대표 가맹점 정규화 (Top 5 최다 소비처 랭킹 및 통계 시 활용)
 */
export function normalizeMerchant(merchant: string): string {
  let m = (merchant || '').trim();

  // (주), 주식회사, 지점 제거
  m = m.replace(/\(주\)|주식회사|\(유\)|㈜/g, '').trim();

  if (/쿠팡|쿠팡페이/.test(m)) return '쿠팡(Coupang)';
  if (/네이버페이|네이버파이낸셜/.test(m)) return '네이버페이';
  if (/아파트관리비/.test(m)) return '아파트 관리비';
  if (/LG유플러스|LGU\+/.test(m)) return 'LG유플러스 통신요금';
  if (/도시가스|충청에너지/.test(m)) return '도시가스';
  if (/우아한형제들|배달의민족/.test(m)) return '배달의민족';
  if (/씨유|CU/.test(m)) return 'CU 편의점';
  if (/GS25/.test(m)) return 'GS25 편의점';
  if (/세븐일레븐/.test(m)) return '세븐일레븐';
  if (/스타벅스/.test(m)) return '스타벅스';
  if (/다이소/.test(m)) return '다이소';
  if (/하이패스|한국도로공사/.test(m)) return '고속도로 통행료/하이패스';
  if (/쿠쿠홈시스/.test(m)) return '쿠쿠홈시스 렌탈';
  if (/에스오일|GS칼텍스|SK에너지|현대오일뱅크|주유소/.test(m)) return '주유소';
  if (/크린토피아/.test(m)) return '크린토피아';

  // 지점명 등 긴 괄호 정리
  m = m.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return m.length > 15 ? m.substring(0, 15) : m;
}

/**
 * 고유 거래 키 생성 (Deduplication 용)
 */
export function getCardTxKey(
  txDate: string,
  cardName: string,
  merchant: string,
  amount: number
): string {
  return `${txDate.trim()}__${cardName.trim()}__${merchant.trim()}__${amount}`;
}

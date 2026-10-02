import { CardStatementTx } from '../types/finance';
import { classifyMerchant, classifyCardOwner, isFixedCardExpense, normalizeMerchant } from '../utils/cardClassifier';

const sampleMerchants = [
  // 가족 카드 (온라인쇼핑, 마트/편의점, 생활용품 중심)
  { merchant: '쿠팡(쿠팡페이)', card: '가족 X BOOST', baseAmt: 45000, days: [2, 5, 9, 12, 16, 21, 25, 28] },
  { merchant: '네이버페이', card: '가족 X BOOST', baseAmt: 28000, days: [4, 11, 18, 23] },
  { merchant: '씨유 편의점', card: '가족 X BOOST', baseAmt: 8500, days: [1, 7, 14, 20, 27] },
  { merchant: '홈플러스 청주점', card: '가족 X BOOST', baseAmt: 125000, days: [8, 22] },
  { merchant: '다이소 청주터미널점', card: '가족 X BOOST', baseAmt: 18000, days: [10, 24] },
  { merchant: '배달의민족', card: '가족 X BOOST', baseAmt: 34000, days: [6, 15, 21, 29] },
  { merchant: '파리바게뜨', card: '가족 X BOOST', baseAmt: 16000, days: [3, 17] },
  { merchant: '센트럴영어학원', card: '가족 X BOOST', baseAmt: 350000, days: [15] },
  { merchant: '한신태권도장', card: '가족 X BOOST', baseAmt: 180000, days: [10] },

  // 본인 카드 (주유, 차량정비, 교통, 식대, 공과금 고정비 중심)
  { merchant: '아파트관리비', card: 'MX Black', baseAmt: 385000, days: [25] },
  { merchant: 'LG유플러스(통신요금)', card: 'MX Black', baseAmt: 115000, days: [20] },
  { merchant: '충청에너지(도시가스)', card: 'MX Black', baseAmt: 65000, days: [18] },
  { merchant: '쿠쿠홈시스(렌탈)', card: 'MX Black', baseAmt: 35900, days: [15] },
  { merchant: '에스오일 주유소', card: 'MX Black', baseAmt: 85000, days: [5, 19] },
  { merchant: 'GS칼텍스 에너지뱅크', card: 'ZERO Ed3', baseAmt: 78000, days: [12, 26] },
  { merchant: '한국도로공사 하이패스', card: '하이패스', baseAmt: 25000, days: [3, 10, 17, 24] },
  { merchant: '카카오T 택시', card: 'MX Black', baseAmt: 14500, days: [8, 22] },
  { merchant: '스타벅스', card: 'MX Black', baseAmt: 11000, days: [2, 9, 16, 23, 30] },
  { merchant: '이디야커피', card: 'ZERO Ed3', baseAmt: 6500, days: [4, 11, 18] },
  { merchant: '명륜진사갈비 식당', card: 'MX Black', baseAmt: 79000, days: [14] },
  { merchant: 'BHC 치킨', card: 'MX Black', baseAmt: 26000, days: [7, 21] },
  { merchant: '크린토피아 세탁', card: 'ZERO Ed3', baseAmt: 22000, days: [13, 27] },
  { merchant: '밝은안과의원', card: 'MX Black', baseAmt: 45000, days: [16] }
];

export function generateDemoCardStatements(): CardStatementTx[] {
  const months = [
    '2025-10', '2025-11', '2025-12',
    '2026-01', '2026-02', '2026-03',
    '2026-04', '2026-05', '2026-06',
    '2026-07', '2026-08', '2026-09'
  ];

  // 월별 계절/이벤트별 실질 소비 변동 가중치 (플랫 라인 방지 & 실제 가계 소비 주기 반영)
  const monthWeights: Record<string, { multiplier: number; gasMultiplier: number }> = {
    '2025-10': { multiplier: 0.92, gasMultiplier: 0.8 }, // 가을
    '2025-11': { multiplier: 1.05, gasMultiplier: 1.1 }, // 김장/블랙프라이데이
    '2025-12': { multiplier: 1.28, gasMultiplier: 1.8 }, // 연말모임/난방비 급증/크리스마스
    '2026-01': { multiplier: 0.98, gasMultiplier: 1.9 }, // 1월 한파 난방비
    '2026-02': { multiplier: 1.14, gasMultiplier: 1.6 }, // 설 명절/선물비
    '2026-03': { multiplier: 0.95, gasMultiplier: 1.2 }, // 봄 학기 시작
    '2026-04': { multiplier: 0.90, gasMultiplier: 0.8 }, // 지출 안정기
    '2026-05': { multiplier: 1.18, gasMultiplier: 0.6 }, // 가정의 달 (어린이날/어버이날 행사)
    '2026-06': { multiplier: 0.96, gasMultiplier: 0.5 }, // 초여름
    '2026-07': { multiplier: 1.22, gasMultiplier: 0.5 }, // 여름휴가 시작/냉방비
    '2026-08': { multiplier: 1.32, gasMultiplier: 0.5 }, // 여름휴가 피크/외식/숙박
    '2026-09': { multiplier: 1.06, gasMultiplier: 0.7 }  // 추석 명절
  };

  const list: CardStatementTx[] = [];
  let idCounter = 1;

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const ym = months[mIdx];
    const weight = monthWeights[ym] || { multiplier: 1.0, gasMultiplier: 1.0 };

    for (const item of sampleMerchants) {
      for (const day of item.days) {
        const dateStr = `${ym}-${String(day).padStart(2, '0')}`;
        
        // 일별 및 월별 해시 변동성
        const dayVariance = 0.92 + (((day * 13 + mIdx * 17) % 21) / 100);
        let dynamicAmt = item.baseAmt * weight.multiplier * dayVariance;

        // 도시가스 동절기 차등 반영
        if (item.merchant.includes('도시가스')) {
          dynamicAmt = item.baseAmt * weight.gasMultiplier * (0.95 + (day % 10) / 100);
        }

        const amount = Math.round(dynamicAmt / 100) * 100;
        const category = classifyMerchant(item.merchant, item.card);
        const cardOwner = classifyCardOwner(item.card);
        const normalized = normalizeMerchant(item.merchant);
        const isFixed = isFixedCardExpense(item.merchant, category);

        list.push({
          id: `demo_card_${idCounter++}`,
          statementMonth: ym,
          txDate: dateStr,
          cardName: item.card,
          cardOwner,
          merchant: item.merchant,
          normalizedMerchant: normalized,
          category,
          amount,
          isFixed,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  return list.sort((a, b) => b.txDate.localeCompare(a.txDate));
}

export const initialDemoCardTransactions = generateDemoCardStatements();


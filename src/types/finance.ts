export type TransactionCategory =
  | '수입:근로소득(급여)'
  | '수입:자산이전(내부입금)'
  | '수입:비경상/환급'
  | '자산이동:저축투자'
  | '변동지출:카드생활비'
  | '고정지출:배우자생활비'
  | '고정지출:보장성보험료'
  | '고정지출:부모님정기용돈'
  | '변동지출:자녀교육/용돈'
  | '비정기지출:경조사비'
  | '비정기지출:기타송금'
  | '기타';

export interface ParsedTx {
  id: string;
  txDatetime: string;
  txType: string;
  desc: string;
  outAmt: number;
  inAmt: number;
  balance: number;
  branch: string;
  category: TransactionCategory;
  isInternalTransfer: boolean;
  memo?: string;
  createdAt?: string;
}

export interface MonthlySummary {
  yearMonth: string; // 'YYYY-MM'
  salaryIncome: number;
  otherIncome: number;
  totalIncome: number;
  pureExpense: number; // 실질 가계지출 (자산이동 제외)
  cardExpense: number; // 현대/신한카드 결제액
  fixedExpense: number; // 보장성보험료 + 배우자생활비 + 부모님용돈
  irregularExpense: number; // 경조사비 + 기타송금
  childEduExpense: number; // 청주페이, 학원/용돈
  internalTransferOut: number; // 홍승균, 미래에셋, 청약 등 저축투자
  surplusCash: number; // 잉여 현금 (급여 - 실질지출)
  savingsRate: number; // 저축률 (%)
  cardMomGrowth: number; // 카드값 전월 대비 증감률 (%)
  txCount: number;
}

export interface CoreKPIStats {
  avgSurplusCash: number; // 최근 3년 월평균 잉여 현금
  estAnnualSavings: number; // 연간 자산 형성 가능액
  avgSavingsRate: number; // 전체 저축률 (%)
  prevYearSavingsRate: number; // 2024년 저축률 (14.0%)
  currentYearSavingsRate: number; // 2026년 저축률 (35.8%)
  recentCardExpense: number; // 이번 달 카드값
  prevCardExpense: number; // 전월 카드값
  cardMomGrowthRate: number; // 전월 대비 증감률 (%)
  isCardAlert: boolean; // 10% 초과 여부
  kimChulTotal: number; // 장인어른(김철) 누적 송금
  eventExpenseTotal: number; // 전체 경조사비 누적
  eventAnnualAvg: number; // 연평균 경조사비 누적
  totalSalary: number;
  totalPureExpense: number;
  totalInternalTransfer: number; // 홍승균 등 자산이동 합계 (1.86억 등)
  monthCount: number;
}

export interface FilterState {
  searchKeyword: string;
  selectedCategory: string;
  yearMonth: string; // 'ALL' or 'YYYY-MM'
  hideInternalTransfers: boolean; // 기본 true (자산이동 격리)
  typeFilter: 'ALL' | 'EXPENSE' | 'INCOME';
  startDate: string;
  endDate: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}

// -------------------------------------------------------------
// 현대카드 명세서 데이터 타입
// -------------------------------------------------------------
export type CardCategory =
  | '교육/학원'
  | '주거/공과금'
  | '통신비'
  | '생활렌탈/구독'
  | '교통/택시'
  | '통행료/하이패스'
  | '차량/주유/정비'
  | '온라인쇼핑'
  | '마트/편의점'
  | '배달음식'
  | '카페/베이커리'
  | '외식/식당'
  | '문화/여행/여가'
  | '의료/건강'
  | '뷰티/생활서비스'
  | '금융/연회비'
  | '기타소비';

export interface CardStatementTx {
  id: string;
  statementMonth: string; // 'YYYY-MM'
  txDate: string; // 'YYYY-MM-DD'
  cardName: string; // 'MX Black', '가족 X BOOST', 'ZERO Ed3', '하이패스' 등
  cardOwner: '본인' | '가족';
  merchant: string; // 원본 가맹점명
  normalizedMerchant: string; // 정제된 대표 가맹점명 (Top 5 집계용)
  category: string; // 8대 정밀 카테고리
  amount: number; // 실제 결제/청구 금액 (원)
  discountAmt?: number; // 청구할인 등
  isFixed: boolean; // 고정성 지출 여부 (관리비, 통신비, 가스, 렌탈, 학원비)
  rawIndex?: number;
  memo?: string;
  createdAt?: string;
}

export interface CardMonthSummary {
  statementMonth: string;
  totalAmount: number;
  selfAmount: number;
  familyAmount: number;
  selfRatio: number; // %
  familyRatio: number; // %
  fixedAmount: number; // 고정성 카드지출
  variableAmount: number; // 순수 변동 소비
  txCount: number;
  topMerchants: { name: string; amount: number; count: number }[];
  categoryTotals: Record<string, number>;
  momGrowthRate?: number; // 전월비 증감률 (%)
}

// -------------------------------------------------------------
// 통합 현금흐름 (All-in-One Integrated Cashflow) 타입
// -------------------------------------------------------------
export interface UnifiedMonthlyData {
  yearMonth: string; // 'YYYY-MM'

  // 1. 총수입 (Income)
  totalIncome: number;
  salaryIncome: number;
  otherIncome: number;

  // 2. 고정비 (Fixed)
  totalFixed: number;
  bankFixed: number; // 계좌이체분 (보험, 생활비, 정기용돈 등)
  cardFixed: number; // 카드결제분 (관리비, 통신비, 가스, 렌탈, 지방세)
  fixedDetails: {
    apartmentMaintenance: number; // 아파트관리비
    telecom: number; // 통신비 (LG유플러스)
    cityGas: number; // 도시가스 (충청에너지)
    rental: number; // 쿠쿠홈시스 (렌탈)
    localTax: number; // 지방세
    insurance: number; // 보장성 보험료
    spouseLiving: number; // 배우자 생활비
    parentsAllowance: number; // 부모님 정기용돈
    otherFixed: number;
  };

  // 3. 변동생활비 (Variable)
  totalVariable: number;
  cardPureVariable: number; // 카드 순수소비 (쇼핑, 외식, 마트, 교통 등)
  totalEduExpense: number; // 통합 자녀 교육비 (청주페이 + 카드 학원비)
  eduCheongjuPay: number; // 청주페이 충전액 (은행 출금)
  eduCardAcademy: number; // 카드 학원 결제액
  eventExpense: number; // 경조사비 (부모님 비정기, 장인/장모, 가족 친지)
  otherBankTransfer: number; // 기타 비정기 송금
  bankOtherExpense: number; // 경조사비 + 기타 비정기 송금

  // 4. 지출 대 카테고리 (도넛 차트용)
  donutCategories: {
    fixed: number; // 고정비(관리비/통신비/공과금/보험/배우자생활비/부모님용돈)
    education: number; // 자녀 교육비 (청주페이 + 카드 학원비)
    familyEvents: number; // 경조사비 & 비정기 송금
    onlineShopping: number; // 온라인 쇼핑 / 이커머스 (쿠팡 등)
    foodDining: number; // 식비 / 마트 / 편의점 / 외식
    transportVehicle: number; // 교통 / 차량 / 기타

    // 9대 정밀 카테고리 (전체화면 정밀 분석용)
    detailed: {
      spouseLiving: number; // 고정: 배우자 생활비
      insurance: number; // 고정: 보장성 보험료
      parentsAllowance: number; // 고정: 부모님 정기용돈
      housingUtilities: number; // 고정: 주거 관리비/공과금/렌탈/통신
      education: number; // 자녀 교육비 (청주페이 + 카드 학원비)
      familyEvents: number; // 비정기: 경조사비 & 가족 비정기 송금
      onlineShopping: number; // 온라인 쇼핑 / 이커머스
      foodDining: number; // 식비 / 마트 / 편의점 / 외식 / 카페
      transportVehicle: number; // 교통 / 차량 / 주유 / 기타 생활소비
    };
  };

  // 5. 잉여현금 (Surplus) & 저축률
  netSurplus: number; // 총수입 - 고정비 - 변동생활비
  totalExpense: number; // 고정비 + 변동생활비
  savingsRate: number; // (잉여현금 / 총수입) * 100
  isDeficit: boolean; // 적자 여부

  // 6. 집계 메타데이터
  bankTxCount: number;
  cardTxCount: number;
  excludedCardTransferAmt: number; // 이중 계산 방지로 제외된 카드대금 이체액
}

export interface EducationDetailTx {
  id: string;
  date: string;
  source: '청주페이' | '현대카드';
  title: string;
  amount: number;
  memo?: string;
}

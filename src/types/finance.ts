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

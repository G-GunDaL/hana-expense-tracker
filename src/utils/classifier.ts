import { TransactionCategory } from '../types/finance';

export type { TransactionCategory };

export const CATEGORIES: Record<string, TransactionCategory> = {
  SALARY: '수입:근로소득(급여)',
  INTERNAL_IN: '수입:자산이전(내부입금)',
  OTHER_IN: '수입:비경상/환급',
  INTERNAL_TRANSFER: '자산이동:저축투자',
  CARD: '변동지출:카드생활비',
  WIFE_LIVING: '고정지출:배우자생활비',
  INSURANCE: '고정지출:보장성보험료',
  PARENTS_LIVING: '고정지출:부모님정기용돈',
  CHILD_EDU: '변동지출:자녀교육/용돈',
  FAMILY_EVENT: '비정기지출:경조사비',
  OTHER_EXPENSE: '비정기지출:기타송금',
  ETC: '기타'
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  '수입:근로소득(급여)': '#008485', // 하나 시그니처 틸
  '수입:자산이전(내부입금)': '#64748b',
  '수입:비경상/환급': '#0284c7',
  '자산이동:저축투자': '#8b5cf6', // 퍼플 (자산이동 격리용)
  '변동지출:카드생활비': '#e60050', // 하나 레드
  '고정지출:배우자생활비': '#10b981', // 에메랄드
  '고정지출:보장성보험료': '#f59e0b', // 앰버
  '고정지출:부모님정기용돈': '#14b8a6', // 틸
  '변동지출:자녀교육/용돈': '#ec4899', // 핑크
  '비정기지출:경조사비': '#f97316', // 오렌지
  '비정기지출:기타송금': '#64748b', // 슬레이트
  '기타': '#94a3b8'
};

export interface ClassifyRowParams {
  txDatetime: string;
  txType: string;
  desc: string;
  inAmt: number;
  outAmt: number;
}

export function classifyTransaction(row: ClassifyRowParams): { category: TransactionCategory; isInternalTransfer: boolean } {
  const { txDatetime, txType, desc, inAmt, outAmt } = row;
  const d = (desc || '').trim();
  const t = (txType || '').trim();

  // 날짜 안전 파싱 (YYYY-MM-DD 또는 ISO)
  let day = 0;
  const match = (txDatetime || '').match(/\d{4}[-./](\d{2})[-./](\d{2})/);
  if (match) {
    day = parseInt(match[2], 10);
  } else if (txDatetime) {
    const date = new Date(txDatetime);
    day = isNaN(date.getDate()) ? 0 : date.getDate();
  }

  // 1. 입금 분류
  if (inAmt > 0) {
    if (t.includes('급여이체') || d.includes('급여이체')) {
      return { category: '수입:근로소득(급여)', isInternalTransfer: false };
    }
    if (d.includes('홍승균')) {
      return { category: '수입:자산이전(내부입금)', isInternalTransfer: true };
    }
    return { category: '수입:비경상/환급', isInternalTransfer: false };
  }

  // 2. 출금 분류
  if (outAmt > 0) {
    // A. 자산 간 이동 (저축/투자) - 실지출 절대 제외
    if (
      d.includes('홍승균') ||
      d.includes('미래에셋') ||
      t.includes('청약') ||
      d.includes('32191024741125')
    ) {
      return { category: '자산이동:저축투자', isInternalTransfer: true };
    }

    // B. 카드 대금 (월 생활비)
    if (d.includes('현대카드') || d.includes('신한카드')) {
      return { category: '변동지출:카드생활비', isInternalTransfer: false };
    }

    // C. 보장성 보험료
    if (
      t.includes('보험료') ||
      ['삼성생명', '메리츠', '현대해상', '흥화', 'IMLI', 'DGBL', 'Abllife'].some((k) => d.includes(k))
    ) {
      return { category: '고정지출:보장성보험료', isInternalTransfer: false };
    }

    // D. 자녀 교육비 및 간편결제
    if (
      ['청주페이', '네이버페이', '카카오페이', '홍지연', '홍지성'].some((k) => d.includes(k))
    ) {
      return { category: '변동지출:자녀교육/용돈', isInternalTransfer: false };
    }

    // E. 배우자 생활비
    if (d.includes('김소영')) {
      return { category: '고정지출:배우자생활비', isInternalTransfer: false };
    }

    // F. 부모님 용돈 vs 경조사비 (이길자, 홍정수)
    // 매월 25일 전후 자동이체(20만 원)는 '정기 용돈', 비정기 송금은 '경조사비'
    if (d.includes('홍정수') || d.includes('이길자')) {
      const isAroundPayday = day >= 24 && day <= 28;
      if (t.includes('자동이체') || (isAroundPayday && outAmt === 200000)) {
        return { category: '고정지출:부모님정기용돈', isInternalTransfer: false };
      }
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }

    // G. 경조사비 (동생 홍승재, 장인어른 김철, 장모님 유병옥, 지인 경조사)
    if (['홍승재', '김철', '유병옥'].some((k) => d.includes(k))) {
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }

    return { category: '비정기지출:기타송금', isInternalTransfer: false };
  }

  return { category: '기타', isInternalTransfer: false };
}

/**
 * 고유 거래 식별 키 생성 (PostgreSQL uq_tx_record 제약 조건과 100% 일치)
 */
export function getTxRecordKey(
  txDatetime: string,
  desc: string,
  outAmt: number,
  inAmt: number,
  balance: number
): string {
  return `${txDatetime.trim()}__${desc.trim()}__${outAmt}__${inAmt}__${balance}`;
}

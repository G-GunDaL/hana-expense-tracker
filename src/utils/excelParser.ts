import * as XLSX from 'xlsx';
import { ParsedTx, MonthlySummary, CoreKPIStats } from '../types/finance';
import { classifyTransaction, getTxRecordKey } from './classifier';

export interface ParseResult {
  newTransactions: ParsedTx[];
  totalParsed: number;
  duplicateCount: number;
  newCount: number;
}

/**
 * 브라우저 로컬에서 안전하게 엑셀(.xls, .xlsx, .csv) 파일을 파싱하고 중복을 제거합니다.
 */
export async function parseHanaBankExcel(
  file: File,
  existingTransactions: ParsedTx[] = []
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // raw 2D array로 변환
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  // 헤더 인덱스 찾기 (하나은행 내역서는 통상 Row 5 내외에 헤더가 위치)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row) && row.some(cell => String(cell).includes('거래일시') || String(cell).includes('적요'))) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error('하나은행 거래내역서 헤더(거래일시, 적요 등)를 찾을 수 없습니다.');
  }

  const header = rows[headerRowIdx].map(c => String(c || '').trim());
  const dateCol = header.findIndex(h => h.includes('거래일시') || h.includes('거래일자'));
  const typeCol = header.findIndex(h => h.includes('구분'));
  const descCol = header.findIndex(h => h.includes('적요') || h.includes('내용'));
  const outCol = header.findIndex(h => h.includes('출금액') || h.includes('출금'));
  const inCol = header.findIndex(h => h.includes('입금액') || h.includes('입금'));
  const balCol = header.findIndex(h => h.includes('잔액'));
  const branchCol = header.findIndex(h => h.includes('거래점') || h.includes('취급점'));

  // 기존 등록된 트랜잭션의 중복 체크 세트
  const existingSet = new Set<string>();
  existingTransactions.forEach(tx => {
    existingSet.add(getTxRecordKey(tx.txDatetime, tx.desc, tx.outAmt, tx.inAmt, tx.balance));
  });

  const newTransactions: ParsedTx[] = [];
  let duplicateCount = 0;
  let totalParsed = 0;

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[dateCol]) continue;

    const rawDate = String(row[dateCol]).trim();
    // 날짜 패턴 체크 (YYYY-MM-DD 또는 YYYY.MM.DD)
    if (!rawDate.match(/^\d{4}[-./]\d{2}[-./]\d{2}/)) continue;

    const formattedDate = rawDate.replace(/\./g, '-');
    const txType = typeCol >= 0 ? String(row[typeCol] || '').trim() : '';
    const desc = descCol >= 0 ? String(row[descCol] || '').trim() : '';
    const outAmt = outCol >= 0 ? Number(String(row[outCol] || 0).replace(/,/g, '')) || 0 : 0;
    const inAmt = inCol >= 0 ? Number(String(row[inCol] || 0).replace(/,/g, '')) || 0 : 0;
    const balance = balCol >= 0 ? Number(String(row[balCol] || 0).replace(/,/g, '')) || 0 : 0;
    const branch = branchCol >= 0 ? String(row[branchCol] || '').trim() : '';

    totalParsed++;

    const key = getTxRecordKey(formattedDate, desc, outAmt, inAmt, balance);
    if (existingSet.has(key)) {
      duplicateCount++;
      continue;
    }

    existingSet.add(key);

    const { category, isInternalTransfer } = classifyTransaction({
      txDatetime: formattedDate,
      txType,
      desc,
      inAmt,
      outAmt
    });

    newTransactions.push({
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      txDatetime: formattedDate,
      txType,
      desc,
      outAmt,
      inAmt,
      balance,
      branch,
      category,
      isInternalTransfer,
      memo: '',
      createdAt: new Date().toISOString()
    });
  }

  return {
    newTransactions,
    totalParsed,
    duplicateCount,
    newCount: newTransactions.length
  };
}

/**
 * 월별 집계 스냅샷(monthly_financial_summaries)을 실시간으로 산출합니다.
 */
export function calculateMonthlySummaries(transactions: ParsedTx[]): MonthlySummary[] {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  if (safeTransactions.length === 0) return [];

  const map = new Map<string, {
    salaryIncome: number;
    otherIncome: number;
    totalIncome: number;
    pureExpense: number;
    cardExpense: number;
    fixedExpense: number;
    irregularExpense: number;
    childEduExpense: number;
    internalTransferOut: number;
    txCount: number;
  }>();

  safeTransactions.forEach(tx => {
    if (!tx || !tx.txDatetime) return;
    const ym = tx.txDatetime.substring(0, 7);
    if (!ym || ym.length < 7) return;

    if (!map.has(ym)) {
      map.set(ym, {
        salaryIncome: 0,
        otherIncome: 0,
        totalIncome: 0,
        pureExpense: 0,
        cardExpense: 0,
        fixedExpense: 0,
        irregularExpense: 0,
        childEduExpense: 0,
        internalTransferOut: 0,
        txCount: 0
      });
    }

    const m = map.get(ym)!;
    m.txCount++;

    // 입금 처리
    if (tx.inAmt > 0) {
      if (tx.category === '수입:근로소득(급여)') {
        m.salaryIncome += tx.inAmt;
        m.totalIncome += tx.inAmt;
      } else if (!tx.isInternalTransfer) {
        m.otherIncome += tx.inAmt;
        m.totalIncome += tx.inAmt;
      }
    }

    // 출금 처리
    if (tx.outAmt > 0) {
      if (tx.isInternalTransfer) {
        // 자산이동: 저축투자 (홍승균, 미래에셋, 청약 등) -> 실질지출에서 완벽 제외
        m.internalTransferOut += tx.outAmt;
      } else {
        // 실질 가계 지출
        m.pureExpense += tx.outAmt;

        if (tx.category === '변동지출:카드생활비') {
          m.cardExpense += tx.outAmt;
        } else if (
          tx.category === '고정지출:보장성보험료' ||
          tx.category === '고정지출:배우자생활비' ||
          tx.category === '고정지출:부모님정기용돈'
        ) {
          m.fixedExpense += tx.outAmt;
        } else if (
          tx.category === '비정기지출:경조사비' ||
          tx.category === '비정기지출:기타송금'
        ) {
          m.irregularExpense += tx.outAmt;
        } else if (tx.category === '변동지출:자녀교육/용돈') {
          m.childEduExpense += tx.outAmt;
        }
      }
    }
  });

  const sortedKeys = Array.from(map.keys()).sort();
  const summaries: MonthlySummary[] = [];

  for (let i = 0; i < sortedKeys.length; i++) {
    const ym = sortedKeys[i];
    const data = map.get(ym)!;
    const surplusCash = data.salaryIncome - data.pureExpense;
    const savingsRate = data.salaryIncome > 0
      ? Number(((surplusCash / data.salaryIncome) * 100).toFixed(2))
      : 0;

    let cardMomGrowth = 0;
    if (i > 0) {
      const prevYm = sortedKeys[i - 1];
      const prevCard = map.get(prevYm)?.cardExpense || 0;
      if (prevCard > 0) {
        cardMomGrowth = Number((((data.cardExpense - prevCard) / prevCard) * 100).toFixed(2));
      }
    }

    summaries.push({
      yearMonth: ym,
      ...data,
      surplusCash,
      savingsRate,
      cardMomGrowth
    });
  }

  return summaries;
}

/**
 * 4대 핵심 모니터링 KPI를 계산합니다.
 */
export function calculateCoreKPIStats(
  transactions: ParsedTx[],
  summaries: MonthlySummary[]
): CoreKPIStats {
  const safeSummaries = Array.isArray(summaries) ? summaries : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  if (safeSummaries.length === 0) {
    return {
      avgSurplusCash: 0,
      estAnnualSavings: 0,
      avgSavingsRate: 0,
      prevYearSavingsRate: 0,
      currentYearSavingsRate: 0,
      recentCardExpense: 0,
      prevCardExpense: 0,
      cardMomGrowthRate: 0,
      isCardAlert: false,
      kimChulTotal: 0,
      eventExpenseTotal: 0,
      eventAnnualAvg: 0,
      totalSalary: 0,
      totalPureExpense: 0,
      totalInternalTransfer: 0,
      monthCount: 0
    };
  }

  const monthCount = safeSummaries.length;
  let totalSalary = 0;
  let totalPureExpense = 0;
  let totalInternalTransfer = 0;
  let eventExpenseTotal = 0;
  let kimChulTotal = 0;

  safeSummaries.forEach(s => {
    if (!s) return;
    totalSalary += (s.salaryIncome || 0);
    totalPureExpense += (s.pureExpense || 0);
    totalInternalTransfer += (s.internalTransferOut || 0);
  });

  // 개별 거래에서 김철 및 경조사비 정밀 집계
  safeTransactions.forEach(tx => {
    if (!tx) return;
    const outAmt = Number(tx.outAmt) || 0;
    if (outAmt > 0) {
      if (tx.desc && tx.desc.includes('김철')) {
        kimChulTotal += outAmt;
      }
      if (tx.category === '비정기지출:경조사비') {
        eventExpenseTotal += outAmt;
      }
    }
  });

  const avgSurplusCash = Math.round((totalSalary - totalPureExpense) / monthCount);
  const estAnnualSavings = avgSurplusCash * 12;
  const avgSalary = totalSalary / monthCount;
  const avgSavingsRate = avgSalary > 0
    ? Number(((avgSurplusCash / avgSalary) * 100).toFixed(1))
    : 0;

  // 연도별 저축률 (2024년 vs 2026년 개선율 배지용)
  const summariesByYear: Record<string, { salary: number; expense: number }> = {};
  summaries.forEach(s => {
    const y = s.yearMonth.substring(0, 4);
    if (!summariesByYear[y]) summariesByYear[y] = { salary: 0, expense: 0 };
    summariesByYear[y].salary += s.salaryIncome;
    summariesByYear[y].expense += s.pureExpense;
  });

  const calcYearRate = (year: string) => {
    const d = summariesByYear[year];
    if (!d || d.salary === 0) return 0;
    return Number((((d.salary - d.expense) / d.salary) * 100).toFixed(1));
  };

  const prevYearSavingsRate = calcYearRate('2024'); // 14.0%
  const currentYearSavingsRate = calcYearRate('2026') || calcYearRate('2025'); // 35.8%

  // 카드값 MoM
  const lastSummary = summaries[summaries.length - 1];
  const prevSummary = summaries.length >= 2 ? summaries[summaries.length - 2] : null;

  const recentCardExpense = lastSummary ? lastSummary.cardExpense : 0;
  const prevCardExpense = prevSummary ? prevSummary.cardExpense : 0;
  let cardMomGrowthRate = 0;
  if (prevCardExpense > 0) {
    cardMomGrowthRate = Number((((recentCardExpense - prevCardExpense) / prevCardExpense) * 100).toFixed(1));
  }
  const isCardAlert = cardMomGrowthRate >= 10;

  const yearRange = Math.max(1, monthCount / 12);
  const eventAnnualAvg = Math.round(eventExpenseTotal / yearRange);

  return {
    avgSurplusCash,
    estAnnualSavings,
    avgSavingsRate,
    prevYearSavingsRate,
    currentYearSavingsRate,
    recentCardExpense,
    prevCardExpense,
    cardMomGrowthRate,
    isCardAlert,
    kimChulTotal,
    eventExpenseTotal,
    eventAnnualAvg,
    totalSalary,
    totalPureExpense,
    totalInternalTransfer,
    monthCount
  };
}

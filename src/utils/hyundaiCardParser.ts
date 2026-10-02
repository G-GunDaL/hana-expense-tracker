import * as XLSX from 'xlsx';
import { CardStatementTx, CardMonthSummary } from '../types/finance';
import { 
  classifyMerchant, 
  classifyCardOwner, 
  isFixedCardExpense, 
  normalizeMerchant, 
  getCardTxKey 
} from './cardClassifier';

export interface CardFileParseResult {
  fileName: string;
  statementMonth: string;
  totalParsed: number;
  validTxCount: number;
  discountCount: number;
  totalAmount: number;
  transactions: CardStatementTx[];
  error?: string;
}

export interface MultiCardParseReport {
  filesProcessed: number;
  totalNewTxs: number;
  replacedMonths: string[];
  results: CardFileParseResult[];
}

/**
 * 텍스트나 버퍼에서 청구월(YYYY-MM) 자동 추출
 * 예: "2026년 09월 이용대금명세서", "2025년 10월", 파일명 "hyundaicard_202609.xls" 등
 */
export function extractStatementMonth(textSample: string, fileName: string): string {
  // 1. 문서 본문에서 "YYYY년 MM월 이용대금명세서" 패턴 탐색
  const titleMatch = textSample.match(/(\d{4})\s*년\s*(\d{1,2})\s*월(?:\s*이용대금명세서)?/);
  if (titleMatch) {
    const year = titleMatch[1];
    const month = titleMatch[2].padStart(2, '0');
    return `${year}-${month}`;
  }

  // 2. 파일명에서 탐색 (hyundaicard_202609.xls, 2026-09.xls 등)
  const fileMatch = fileName.match(/(\d{4})[-_.]?(\d{2})/);
  if (fileMatch) {
    return `${fileMatch[1]}-${fileMatch[2]}`;
  }

  // 3. 대체 패턴: YYYY.MM 또는 YYYY/MM
  const altMatch = textSample.match(/(\d{4})[./](\d{1,2})/);
  if (altMatch) {
    return `${altMatch[1]}-${altMatch[2].padStart(2, '0')}`;
  }

  // 현재 월 기준 기본값
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 날짜 문자열 정규화 (YYYY-MM-DD 포맷)
 * 지원 형식: "2026년 09월 15일", "2026.09.15", "2026-09-15", "09/15" 등
 */
function normalizeDate(rawDate: string, defaultYearMonth: string): string | null {
  if (!rawDate || rawDate.trim() === '-' || rawDate.trim() === '') return null;
  const d = rawDate.trim();

  // YYYY년 MM월 DD일
  const m1 = d.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  if (m1) {
    return `${m1[1]}-${m1[2].padStart(2, '0')}-${m1[3].padStart(2, '0')}`;
  }

  // YYYY.MM.DD 또는 YYYY-MM-DD
  const m2 = d.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`;
  }

  // MM월 DD일 또는 MM/DD (연도 생략 시 defaultYearMonth 사용)
  const m3 = d.match(/(\d{1,2})[-./월]\s*(\d{1,2})\s*일?/);
  if (m3) {
    const year = defaultYearMonth.substring(0, 4);
    return `${year}-${m3[1].padStart(2, '0')}-${m3[2].padStart(2, '0')}`;
  }

  return null;
}

/**
 * 단일 현대카드 이용대금명세서(.xls) 파일 파싱
 */
export async function parseHyundaiCardExcel(file: File): Promise<CardFileParseResult> {
  const buffer = await file.arrayBuffer();

  // 1. 텍스트 샘플 디코딩 (청구월 추출용)
  let textSample = '';
  try {
    const decoder = new TextDecoder('utf-8');
    textSample = decoder.decode(buffer.slice(0, 15000));
    if (!textSample.includes('년') && !textSample.includes('월')) {
      const eucDecoder = new TextDecoder('euc-kr');
      textSample = eucDecoder.decode(buffer.slice(0, 15000));
    }
  } catch {
    textSample = '';
  }

  const statementMonth = extractStatementMonth(textSample, file.name);

  // 2. SheetJS로 워크북 읽기
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  // 3. 헤더 인덱스 탐색
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(25, rows.length); i++) {
    const row = rows[i];
    if (Array.isArray(row)) {
      const rowStr = row.map(c => String(c || '')).join(' ');
      if (
        (rowStr.includes('이용일') || rowStr.includes('이용일자')) &&
        (rowStr.includes('가맹점') || rowStr.includes('이용가맹점') || rowStr.includes('내용'))
      ) {
        headerRowIdx = i;
        break;
      }
    }
  }

  // 헤더가 없을 경우 자동 기본 열 추론
  const header = headerRowIdx >= 0 ? rows[headerRowIdx].map(c => String(c || '').trim()) : [];
  let dateCol = header.findIndex(h => h.includes('이용일') || h.includes('거래일'));
  let cardCol = header.findIndex(h => h.includes('카드명') || h.includes('카드'));
  let merchantCol = header.findIndex(h => h.includes('가맹점') || h.includes('이용처') || h.includes('적요'));
  let amountCol = header.findIndex(h => h.includes('이용금액') || h.includes('청구금액') || h.includes('원금') || h.includes('금액'));

  // 헤더를 못 찾았을 때 기본 위치 폴백 (통상 0:이용일, 1:카드명, 2:가맹점, 3:이용금액)
  if (dateCol === -1) dateCol = 0;
  if (cardCol === -1) cardCol = 1;
  if (merchantCol === -1) merchantCol = 2;
  if (amountCol === -1) amountCol = 3;

  const startIdx = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const transactions: CardStatementTx[] = [];
  let totalParsed = 0;
  let discountCount = 0;
  let totalAmount = 0;

  for (let i = startIdx; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawDate = String(row[dateCol] || '').trim();
    const rawCard = String(row[cardCol] || '').trim();
    const rawMerchant = String(row[merchantCol] || '').trim();
    const rawAmtStr = String(row[amountCol] || '0').replace(/,/g, '').trim();
    const amount = Number(rawAmtStr) || 0;

    totalParsed++;

    // 1. 소계, 합계, 할인 소계 등 요약 행 필터링
    if (
      /소\s*계|합\s*계|할인\s*소계|총\s*청구|월\s*합계/.test(rawMerchant) ||
      /소\s*계|합\s*계/.test(rawDate) ||
      /소\s*계|합\s*계/.test(rawCard)
    ) {
      continue;
    }

    // 2. 날짜 유효성 검사 (이용일이 없거나 '-'인 행 제거)
    const txDate = normalizeDate(rawDate, statementMonth);
    if (!txDate) {
      continue;
    }

    // 3. 가맹점이 없거나 청구할인 행 처리
    if (!rawMerchant) continue;

    // 청구할인 행 체크 (예: 'MXB Ed2 청구할인', 'ZERO Ed3 0.8% 할인' 등)
    const isDiscountRow = /청구할인|0\.8%\s*할인|M포인트\s*할인|캐시백/.test(rawMerchant);
    if (isDiscountRow) {
      discountCount++;
      // 음수 금액이거나 할인 행인 경우에도 기록하거나 직전 거래에 반영 가능
    }

    // 4. 분류 엔진 적용
    const category = classifyMerchant(rawMerchant, rawCard);
    const cardOwner = classifyCardOwner(rawCard);
    const normalizedMerchant = normalizeMerchant(rawMerchant);
    const isFixed = isFixedCardExpense(rawMerchant, category);

    totalAmount += amount;

    transactions.push({
      id: `ctx_${statementMonth}_${transactions.length + 1}_${Math.random().toString(36).substr(2, 6)}`,
      statementMonth,
      txDate,
      cardName: rawCard || '현대카드',
      cardOwner,
      merchant: rawMerchant,
      normalizedMerchant,
      category,
      amount,
      isFixed,
      rawIndex: i,
      createdAt: new Date().toISOString()
    });
  }

  return {
    fileName: file.name,
    statementMonth,
    totalParsed,
    validTxCount: transactions.length,
    discountCount,
    totalAmount,
    transactions
  };
}

/**
 * 다중 파일 일괄 업로드 처리 (1개 ~ 11개 이상 지원)
 * 청구월(statement_month) 기준 덮어쓰기(Upsert) 및 중복 방지
 */
export async function parseMultipleHyundaiCardFiles(
  files: File[],
  existingTxs: CardStatementTx[] = []
): Promise<{
  mergedTransactions: CardStatementTx[];
  report: MultiCardParseReport;
}> {
  const results: CardFileParseResult[] = [];
  const incomingByMonth = new Map<string, CardStatementTx[]>();
  const replacedMonths = new Set<string>();

  for (const file of files) {
    try {
      const res = await parseHyundaiCardExcel(file);
      results.push(res);

      if (res.transactions.length > 0) {
        replacedMonths.add(res.statementMonth);
        if (!incomingByMonth.has(res.statementMonth)) {
          incomingByMonth.set(res.statementMonth, []);
        }
        incomingByMonth.get(res.statementMonth)!.push(...res.transactions);
      }
    } catch (err: any) {
      console.error(`Failed to parse ${file.name}:`, err);
      results.push({
        fileName: file.name,
        statementMonth: '',
        totalParsed: 0,
        validTxCount: 0,
        discountCount: 0,
        totalAmount: 0,
        transactions: [],
        error: err.message || '파싱 에러'
      });
    }
  }

  // 기존 트랜잭션 중 새로 업로드된 월(statementMonth)의 데이터는 덮어쓰기(교체)하고,
  // 업로드되지 않은 월의 데이터는 그대로 보존합니다.
  const preservedTxs = existingTxs.filter(tx => !replacedMonths.has(tx.statementMonth));

  // 새 트랜잭션 합치기 (동일 월 내 중복 거래 고유 키 체크)
  const newTxsToAdd: CardStatementTx[] = [];
  const seenKeys = new Set<string>();

  incomingByMonth.forEach((txList, month) => {
    txList.forEach(tx => {
      const key = `${month}__${getCardTxKey(tx.txDate, tx.cardName, tx.merchant, tx.amount)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        newTxsToAdd.push(tx);
      }
    });
  });

  const mergedTransactions = [...preservedTxs, ...newTxsToAdd].sort((a, b) => {
    // 날짜 역순 (최신순)
    return b.txDate.localeCompare(a.txDate);
  });

  return {
    mergedTransactions,
    report: {
      filesProcessed: files.length,
      totalNewTxs: newTxsToAdd.length,
      replacedMonths: Array.from(replacedMonths).sort(),
      results
    }
  };
}

/**
 * 월별 카드 통계 및 KPI 요약 계산
 */
export function calculateCardMonthSummaries(
  transactions: CardStatementTx[]
): Map<string, CardMonthSummary> {
  const map = new Map<string, {
    totalAmount: number;
    selfAmount: number;
    familyAmount: number;
    fixedAmount: number;
    variableAmount: number;
    txCount: number;
    merchantMap: Map<string, { amount: number; count: number }>;
    categoryTotals: Record<string, number>;
  }>();

  transactions.forEach(tx => {
    const ym = tx.statementMonth || tx.txDate.substring(0, 7);
    if (!ym) return;

    if (!map.has(ym)) {
      map.set(ym, {
        totalAmount: 0,
        selfAmount: 0,
        familyAmount: 0,
        fixedAmount: 0,
        variableAmount: 0,
        txCount: 0,
        merchantMap: new Map(),
        categoryTotals: {}
      });
    }

    const m = map.get(ym)!;
    m.txCount++;
    m.totalAmount += tx.amount;

    if (tx.cardOwner === '본인') {
      m.selfAmount += tx.amount;
    } else {
      m.familyAmount += tx.amount;
    }

    if (tx.isFixed) {
      m.fixedAmount += tx.amount;
    } else {
      m.variableAmount += tx.amount;
    }

    // 카테고리별 집계
    m.categoryTotals[tx.category] = (m.categoryTotals[tx.category] || 0) + tx.amount;

    // 가맹점별 집계
    const merchName = tx.normalizedMerchant || tx.merchant;
    if (!m.merchantMap.has(merchName)) {
      m.merchantMap.set(merchName, { amount: 0, count: 0 });
    }
    const merch = m.merchantMap.get(merchName)!;
    merch.amount += tx.amount;
    merch.count += 1;
  });

  const sortedMonths = Array.from(map.keys()).sort();
  const summaryMap = new Map<string, CardMonthSummary>();

  for (let i = 0; i < sortedMonths.length; i++) {
    const ym = sortedMonths[i];
    const data = map.get(ym)!;

    const selfRatio = data.totalAmount > 0 
      ? Number(((data.selfAmount / data.totalAmount) * 100).toFixed(1)) 
      : 0;
    const familyRatio = data.totalAmount > 0 
      ? Number(((data.familyAmount / data.totalAmount) * 100).toFixed(1)) 
      : 0;

    // Top 5 가맹점 정렬
    const topMerchants = Array.from(data.merchantMap.entries())
      .map(([name, val]) => ({ name, amount: val.amount, count: val.count }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // 전월 대비 증감률(MoM)
    let momGrowthRate = 0;
    if (i > 0) {
      const prevYm = sortedMonths[i - 1];
      const prevTotal = map.get(prevYm)?.totalAmount || 0;
      if (prevTotal > 0) {
        momGrowthRate = Number((((data.totalAmount - prevTotal) / prevTotal) * 100).toFixed(1));
      }
    }

    summaryMap.set(ym, {
      statementMonth: ym,
      totalAmount: data.totalAmount,
      selfAmount: data.selfAmount,
      familyAmount: data.familyAmount,
      selfRatio,
      familyRatio,
      fixedAmount: data.fixedAmount,
      variableAmount: data.variableAmount,
      txCount: data.txCount,
      topMerchants,
      categoryTotals: data.categoryTotals,
      momGrowthRate
    });
  }

  return summaryMap;
}

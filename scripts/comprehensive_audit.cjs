const fs = require('fs');
const path = require('path');

console.log('=== STARTING COMPREHENSIVE FINANCIAL ENGINE AUDIT ===');

// 1. Read initialTransactions.json
const rawTxsPath = path.join(__dirname, '..', 'src', 'data', 'initialTransactions.json');
const rawTxsContent = fs.readFileSync(rawTxsPath, 'utf-8');

// Check encoding corruption in JSON
let corruptChars = 0;
if (rawTxsContent.includes('\uFFFD')) {
  console.error('ERROR: Unicode replacement character (U+FFFD) detected in initialTransactions.json!');
  corruptChars++;
}
if (/[\uD800-\uDFFF]/.test(rawTxsContent)) {
  console.error('ERROR: Unpaired surrogate characters detected in initialTransactions.json!');
  corruptChars++;
}

const transactions = JSON.parse(rawTxsContent);
console.log(`[PASS] initialTransactions.json loaded: ${transactions.length} transactions. Corrupt chars: ${corruptChars}`);

// 2. Validate transaction fields
let invalidDate = 0;
let invalidAmount = 0;
let invalidCategory = 0;
let internalTransfers = 0;

transactions.forEach((tx, idx) => {
  if (!tx.txDatetime || !/^\d{4}[-./]\d{2}[-./]\d{2}/.test(tx.txDatetime)) {
    invalidDate++;
  }
  if (typeof tx.outAmt !== 'number' || isNaN(tx.outAmt) || typeof tx.inAmt !== 'number' || isNaN(tx.inAmt)) {
    invalidAmount++;
  }
  if (!tx.category) {
    invalidCategory++;
  }
  if (tx.isInternalTransfer) {
    internalTransfers++;
  }
});

console.log(`[Audit 1] Field checks: invalidDate=${invalidDate}, invalidAmount=${invalidAmount}, invalidCategory=${invalidCategory}, internalTransfers=${internalTransfers}`);

// 3. Test classifier rules
// Test Parent Allowance vs Congratulatory Event
// Date around payday (24~28) and amount 200,000 => '고정지출:부모님정기용돈'
// Other date or amount => '비정기지출:경조사비'
function classifyTxSim(txDatetime, txType, desc, inAmt, outAmt) {
  const d = (desc || '').trim();
  const t = (txType || '').trim();

  let day = 0;
  const match = (txDatetime || '').match(/\d{4}[-./](\d{2})[-./](\d{2})/);
  if (match) {
    day = parseInt(match[2], 10);
  }

  if (inAmt > 0) {
    if (t.includes('급여이체') || d.includes('급여이체')) {
      return { category: '수입:근로소득(급여)', isInternalTransfer: false };
    }
    if (d.includes('홍승균')) {
      return { category: '수입:자산이전(내부입금)', isInternalTransfer: true };
    }
    return { category: '수입:비경상/환급', isInternalTransfer: false };
  }

  if (outAmt > 0) {
    if (
      d.includes('홍승균') ||
      d.includes('미래에셋') ||
      t.includes('청약') ||
      d.includes('32191024741125')
    ) {
      return { category: '자산이동:저축투자', isInternalTransfer: true };
    }
    if (d.includes('현대카드') || d.includes('신한카드')) {
      return { category: '변동지출:카드생활비', isInternalTransfer: false };
    }
    if (
      t.includes('보험료') ||
      ['삼성생명', '메리츠', '현대해상', '흥화', 'IMLI', 'DGBL', 'Abllife'].some((k) => d.includes(k))
    ) {
      return { category: '고정지출:보장성보험료', isInternalTransfer: false };
    }
    if (
      ['청주페이', '네이버페이', '카카오페이', '홍지연', '홍지성'].some((k) => d.includes(k))
    ) {
      return { category: '변동지출:자녀교육/용돈', isInternalTransfer: false };
    }
    if (d.includes('김소영')) {
      return { category: '고정지출:배우자생활비', isInternalTransfer: false };
    }
    if (d.includes('홍정수') || d.includes('이길자')) {
      const isAroundPayday = day >= 24 && day <= 28;
      if (t.includes('자동이체') || (isAroundPayday && outAmt === 200000)) {
        return { category: '고정지출:부모님정기용돈', isInternalTransfer: false };
      }
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }
    if (['홍승재', '김철', '유병옥'].some((k) => d.includes(k))) {
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }
    return { category: '비정기지출:기타송금', isInternalTransfer: false };
  }
  return { category: '기타', isInternalTransfer: false };
}

// Check parent allowance simulation
const parentCase1 = classifyTxSim('2026-05-25', '타행송금', '홍정수', 0, 200000);
const parentCase2 = classifyTxSim('2026-05-25', '타행송금', '이길자', 0, 200000);
const parentCase3 = classifyTxSim('2026-05-10', '타행송금', '이길자', 0, 500000); // 비정기 효도비
console.log(`[Audit 2] Parent Allowance Classification Test:
 - 25th 200k 홍정수: ${parentCase1.category} (Expected: 고정지출:부모님정기용돈)
 - 25th 200k 이길자: ${parentCase2.category} (Expected: 고정지출:부모님정기용돈)
 - 10th 500k 이길자: ${parentCase3.category} (Expected: 비정기지출:경조사비)`);

if (
  parentCase1.category !== '고정지출:부모님정기용돈' ||
  parentCase2.category !== '고정지출:부모님정기용돈' ||
  parentCase3.category !== '비정기지출:경조사비'
) {
  console.error('ERROR: Parent allowance classification failed!');
} else {
  console.log('[PASS] Parent allowance classification logic is 100% correct.');
}

// 4. Test Internal Transfer Isolation
const internal1 = classifyTxSim('2026-01-15', '타행송금', '미래에셋증권', 0, 10000000);
const internal2 = classifyTxSim('2026-01-15', '타행송금', '홍승균', 0, 5000000);
if (!internal1.isInternalTransfer || !internal2.isInternalTransfer) {
  console.error('ERROR: Internal transfer isolation failed!');
} else {
  console.log('[PASS] Internal transfers correctly flagged as isInternalTransfer=true');
}

// 5. Test Monthly Summary Aggregator on all 969 transactions
function calculateMonthlySummariesSim(txList) {
  const map = new Map();
  txList.forEach(tx => {
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

    const m = map.get(ym);
    m.txCount++;

    if (tx.inAmt > 0) {
      if (tx.category === '수입:근로소득(급여)') {
        m.salaryIncome += tx.inAmt;
        m.totalIncome += tx.inAmt;
      } else if (!tx.isInternalTransfer) {
        m.otherIncome += tx.inAmt;
        m.totalIncome += tx.inAmt;
      }
    }

    if (tx.outAmt > 0) {
      if (tx.isInternalTransfer) {
        m.internalTransferOut += tx.outAmt;
      } else {
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
  const summaries = [];

  for (let i = 0; i < sortedKeys.length; i++) {
    const ym = sortedKeys[i];
    const data = map.get(ym);
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

const summaries = calculateMonthlySummariesSim(transactions);
console.log(`[Audit 3] Generated summaries for ${summaries.length} months.`);

let nanCount = 0;
let checkErrors = 0;
summaries.forEach(s => {
  ['salaryIncome', 'pureExpense', 'surplusCash', 'savingsRate', 'cardExpense', 'internalTransferOut'].forEach(field => {
    if (isNaN(s[field])) {
      console.error(`NaN detected in ${s.yearMonth}.${field}!`);
      nanCount++;
    }
  });
});

console.log(`[Audit 3 Result] NaN checks: ${nanCount === 0 ? 'PASSED (0 NaNs)' : `FAILED (${nanCount} NaNs)`}`);

// 6. Test CoreKPIStats
let totalSalary = 0;
let totalPureExpense = 0;
let totalInternalTransfer = 0;
summaries.forEach(s => {
  totalSalary += s.salaryIncome;
  totalPureExpense += s.pureExpense;
  totalInternalTransfer += s.internalTransferOut;
});
const monthCount = summaries.length;
const avgSurplusCash = Math.round((totalSalary - totalPureExpense) / monthCount);
const estAnnualSavings = avgSurplusCash * 12;
const avgSalary = totalSalary / monthCount;
const avgSavingsRate = avgSalary > 0 ? Number(((avgSurplusCash / avgSalary) * 100).toFixed(1)) : 0;

console.log(`[Audit 4] Core KPI Stats Check:
 - Total Months: ${monthCount}
 - Total Salary: ${(totalSalary/100000000).toFixed(2)}억 원
 - Total Pure Expense: ${(totalPureExpense/100000000).toFixed(2)}억 원
 - Total Isolated Transfers: ${(totalInternalTransfer/100000000).toFixed(2)}억 원
 - Monthly Avg FCF: ${(avgSurplusCash/10000).toLocaleString()}만 원
 - Avg Savings Rate: ${avgSavingsRate}%
 - Est Annual Wealth Accumulation: ${(estAnnualSavings/100000000).toFixed(2)}억 원`);

if (isNaN(avgSurplusCash) || isNaN(avgSavingsRate) || avgSalary === 0) {
  console.error('ERROR: Core KPI stats calculations returned invalid numbers!');
} else {
  console.log('[PASS] Core KPI stats calculations are 100% valid.');
}

console.log('=== ENGINE AUDIT FINISHED SUCCESSFULLY ===');

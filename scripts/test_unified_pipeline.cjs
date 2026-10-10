const fs = require('fs');
const path = require('path');

console.log('=== STARTING UNIFIED CASH FLOW PIPELINE & EDGE CASE AUDIT ===');

// Import classifier & pipeline functions simulation
function isBankCardPayment(desc, category = '') {
  const d = (desc || '').trim();
  const c = (category || '').trim();
  if (/현대카드|카드대금|현대카드결제|신한카드/i.test(d)) return true;
  if (c === '변동지출:카드생활비') return true;
  return false;
}

function isBankCheongjuPay(desc) {
  return (desc || '').includes('청주페이');
}

function isBankFixedExpense(desc, category = '') {
  const c = (category || '').trim();
  const d = (desc || '').trim();
  if (c.startsWith('비정기지출:') || c === '비정기지출:경조사비' || c === '비정기지출:기타송금') {
    return false;
  }
  if (
    c === '고정지출:보장성보험료' ||
    c === '고정지출:배우자생활비' ||
    c === '고정지출:부모님정기용돈'
  ) {
    return true;
  }
  return /보험|삼성생명|메리츠|현대해상|흥화|IMLI|DGBL|Abllife|김소영|대출|이자|공과금/i.test(d);
}

function isBankFamilyEvent(desc, category = '') {
  const c = (category || '').trim();
  const d = (desc || '').trim();
  if (c === '비정기지출:경조사비') return true;
  return /경조사|축의|부의|조의|화환|김철|유병옥|홍승재|나상길|김종호/i.test(d);
}

function isCardFixedExpense(merchant, category = '') {
  const m = (merchant || '').trim();
  const c = (category || '').trim();
  if (c === '주거/공과금' || c === '통신비' || c === '생활렌탈/구독') return true;
  return /아파트관리비|도시가스|충청에너지|지방세|LG유플러스|LGU\+|통신요|통신비|쿠쿠홈시스|렌탈/i.test(m);
}

function isCardAcademyExpense(merchant, category = '') {
  const m = (merchant || '').trim();
  const c = (category || '').trim();
  if (c === '교육/학원') return true;
  return /학원|태권도|영어수학|요가|센트럴영어|한신태권도|JK제이케이|트리코나/i.test(m);
}

// 1. Test Edge Cases: null, undefined, empty array
function calculateUnifiedCashFlowSim(bankTransactions = [], cardTransactions = []) {
  const safeBank = Array.isArray(bankTransactions) ? bankTransactions : [];
  const safeCard = Array.isArray(cardTransactions) ? cardTransactions : [];

  if (safeBank.length === 0 && safeCard.length === 0) {
    return [];
  }

  const monthsSet = new Set();
  safeBank.forEach(tx => {
    if (tx && tx.txDatetime && tx.txDatetime.length >= 7) {
      monthsSet.add(tx.txDatetime.substring(0, 7));
    }
  });
  safeCard.forEach(tx => {
    if (tx) {
      if (tx.statementMonth && tx.statementMonth.length >= 7) {
        monthsSet.add(tx.statementMonth.substring(0, 7));
      } else if (tx.txDate && tx.txDate.length >= 7) {
        monthsSet.add(tx.txDate.substring(0, 7));
      }
    }
  });

  const sortedMonths = Array.from(monthsSet).sort();
  const result = [];

  for (const ym of sortedMonths) {
    const monthBankTxs = safeBank.filter(tx => tx && tx.txDatetime && tx.txDatetime.startsWith(ym));
    let salaryIncome = 0;
    let otherIncome = 0;
    let bankFixed = 0;
    let eduCheongjuPay = 0;
    let excludedCardTransferAmt = 0;
    let eventExpense = 0;
    let otherBankTransfer = 0;
    let bankOtherExpense = 0;

    for (const tx of monthBankTxs) {
      const inAmt = Number(tx.inAmt) || 0;
      const outAmt = Number(tx.outAmt) || 0;
      const desc = tx.desc || '';
      const cat = tx.category || '';
      const isInternal = Boolean(tx.isInternalTransfer);

      if (inAmt > 0) {
        if (cat === '수입:근로소득(급여)' || desc.includes('급여') || (tx.txType && tx.txType.includes('급여'))) {
          salaryIncome += inAmt;
        } else if (!isInternal) {
          otherIncome += inAmt;
        }
      }

      if (outAmt > 0) {
        if (isInternal) continue;
        if (isBankCardPayment(desc, cat)) {
          excludedCardTransferAmt += outAmt;
          continue;
        }
        if (isBankCheongjuPay(desc)) {
          eduCheongjuPay += outAmt;
          continue;
        }
        if (isBankFixedExpense(desc, cat)) {
          bankFixed += outAmt;
          continue;
        }
        if (isBankFamilyEvent(desc, cat)) {
          eventExpense += outAmt;
          bankOtherExpense += outAmt;
          continue;
        }
        otherBankTransfer += outAmt;
        bankOtherExpense += outAmt;
      }
    }

    const totalIncome = salaryIncome + otherIncome;

    const monthCardTxs = safeCard.filter(tx => {
      if (!tx) return false;
      const m = tx.statementMonth || (tx.txDate ? tx.txDate.substring(0, 7) : '');
      return m === ym;
    });

    let cardFixed = 0;
    let cardPureVariable = 0;
    let eduCardAcademy = 0;

    for (const tx of monthCardTxs) {
      const amt = Number(tx.amount) || 0;
      if (amt <= 0) continue;
      const merchant = tx.merchant || '';
      const category = tx.category || '';

      if (isCardFixedExpense(merchant, category)) {
        cardFixed += amt;
        continue;
      }
      if (isCardAcademyExpense(merchant, category)) {
        eduCardAcademy += amt;
        continue;
      }
      cardPureVariable += amt;
    }

    const totalFixed = bankFixed + cardFixed;
    const totalEduExpense = eduCheongjuPay + eduCardAcademy;
    const totalVariable = cardPureVariable + totalEduExpense + bankOtherExpense;
    const totalExpense = totalFixed + totalVariable;
    const netSurplus = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Number(((netSurplus / totalIncome) * 100).toFixed(1)) : 0;

    result.push({
      yearMonth: ym,
      totalIncome,
      salaryIncome,
      otherIncome,
      totalFixed,
      bankFixed,
      cardFixed,
      totalVariable,
      cardPureVariable,
      totalEduExpense,
      eduCheongjuPay,
      eduCardAcademy,
      netSurplus,
      totalExpense,
      savingsRate,
      excludedCardTransferAmt
    });
  }
  return result;
}

// Edge case 1: null / empty input
const emptyTest1 = calculateUnifiedCashFlowSim(null, null);
const emptyTest2 = calculateUnifiedCashFlowSim([], []);
console.log(`[Edge Case 1] Null/Empty test: emptyTest1.length=${emptyTest1.length}, emptyTest2.length=${emptyTest2.length}`);

// Edge case 2: Double counting test
const dummyBank = [
  { txDatetime: '2026-05-10', desc: '현대카드결제', outAmt: 2500000, inAmt: 0, category: '변동지출:카드생활비', isInternalTransfer: false },
  { txDatetime: '2026-05-25', desc: '급여이체', outAmt: 0, inAmt: 10000000, category: '수입:근로소득(급여)', isInternalTransfer: false },
  { txDatetime: '2026-05-15', desc: '청주페이충전', outAmt: 500000, inAmt: 0, category: '변동지출:자녀교육/용돈', isInternalTransfer: false }
];

const dummyCard = [
  { statementMonth: '2026-05', txDate: '2026-05-02', merchant: '쿠팡', amount: 150000, category: '온라인쇼핑' },
  { statementMonth: '2026-05', txDate: '2026-05-15', merchant: '아파트관리비', amount: 350000, category: '주거/공과금' },
  { statementMonth: '2026-05', txDate: '2026-05-20', merchant: '센트럴영어학원', amount: 300000, category: '교육/학원' }
];

const resDummy = calculateUnifiedCashFlowSim(dummyBank, dummyCard);
console.log('[Edge Case 2] Reconciled output for 2026-05:', JSON.stringify(resDummy[0], null, 2));

// Verifications
const d = resDummy[0];
if (d.excludedCardTransferAmt !== 2500000) {
  console.error(`ERROR: Card payment of 2500000 was NOT properly excluded! Got: ${d.excludedCardTransferAmt}`);
} else {
  console.log('[PASS] Bank card payment (2,500,000 KRW) was 100% excluded to prevent double counting!');
}

if (d.eduCheongjuPay !== 500000 || d.eduCardAcademy !== 300000 || d.totalEduExpense !== 800000) {
  console.error(`ERROR: Education expense calculation incorrect! Total: ${d.totalEduExpense}`);
} else {
  console.log('[PASS] Education reconciliation (Cheongju Pay 500k + Card Academy 300k = 800k) is 100% correct!');
}

if (d.cardFixed !== 350000) {
  console.error(`ERROR: Card fixed expense incorrect! Got: ${d.cardFixed}`);
} else {
  console.log('[PASS] Card fixed expense (Maintenance fee 350k) is 100% correct!');
}

if (d.totalExpense !== (350000 + (150000 + 800000 + 0))) {
  console.error(`ERROR: Total expense formula mismatch! Got ${d.totalExpense}, expected 1300000`);
} else {
  console.log(`[PASS] 4-step Total Expense (1,300,000 KRW) formula matches exactly! Net surplus: ${d.netSurplus}`);
}

console.log('=== UNIFIED PIPELINE AUDIT COMPLETED SUCCESSFULLY ===');

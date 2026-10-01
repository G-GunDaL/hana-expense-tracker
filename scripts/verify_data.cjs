const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '다운로드', 'lastTransactionDetailInquiry_20261001.xls');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

function classifyTransaction(txType, desc, inAmt, outAmt) {
  const d = (desc || '').trim();
  const t = (txType || '').trim();

  // [입금 분류]
  if (inAmt > 0) {
    if (t.includes('급여이체') || d.includes('급여이체')) {
      return { category: '수입:근로소득(급여)', isInternalTransfer: false };
    }
    if (d.includes('홍승균')) {
      return { category: '수입:자산이전(내부입금)', isInternalTransfer: true };
    }
    return { category: '수입:비경상/환급', isInternalTransfer: false };
  }

  // [출금 분류]
  if (outAmt > 0) {
    if (d.includes('홍승균') || d.includes('미래에셋') || t.includes('청약') || d.includes('32191024741125')) {
      return { category: '자산이동:저축투자', isInternalTransfer: true };
    }
    if (d.includes('현대카드') || d.includes('신한카드')) {
      return { category: '변동지출:카드생활비', isInternalTransfer: false };
    }
    if (t.includes('보험료') || ['삼성생명', '메리츠', '현대해상', '흥화', 'IMLI', 'DGBL', 'Abllife'].some(k => d.includes(k))) {
      return { category: '고정지출:보장성보험료', isInternalTransfer: false };
    }
    if (['청주페이', '네이버페이', '카카오페이', '홍지연', '홍지성'].some(k => d.includes(k))) {
      return { category: '변동지출:자녀교육/용돈', isInternalTransfer: false };
    }
    if (d.includes('김소영')) {
      return { category: '고정지출:배우자생활비', isInternalTransfer: false };
    }
    if (['홍정수', '이길자'].some(k => d.includes(k))) {
      return { category: '고정지출:부모님용돈', isInternalTransfer: false };
    }
    if (['김철', '유병옥', '김종호', '나상길'].some(k => d.includes(k))) {
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }
    return { category: '비정기지출:기타송금', isInternalTransfer: false };
  }
  return { category: '기타', isInternalTransfer: false };
}

let catSums = {};
let totalInternalOut = 0;
let totalPureExpense = 0;
let totalSalary = 0;
let hongOut = 0;
let monthlyData = {};

for (let i = 5; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[0]) continue;
  const rawDate = String(row[0]).trim();
  if (rawDate === '거래일시' || !rawDate.match(/^\d{4}-\d{2}-\d{2}/)) continue;

  const txDatetime = rawDate;
  const txType = String(row[1] || '').trim();
  const desc = String(row[2] || '').trim();
  const outAmt = Number(row[3]) || 0;
  const inAmt = Number(row[4]) || 0;
  const balance = Number(row[5]) || 0;
  const branch = String(row[6] || '').trim();

  const ym = txDatetime.substring(0, 7);
  const year = txDatetime.substring(0, 4);

  if (!monthlyData[ym]) {
    monthlyData[ym] = {
      salary: 0,
      pureExpense: 0,
      internalOut: 0,
      cardExpense: 0,
      insuranceExpense: 0,
      wifeExpense: 0,
      parentsExpense: 0,
      childExpense: 0,
      eventExpense: 0,
      otherExpense: 0,
      otherIncome: 0,
      internalIn: 0,
      txCount: 0
    };
  }
  monthlyData[ym].txCount++;

  const { category, isInternalTransfer } = classifyTransaction(txType, desc, inAmt, outAmt);

  if (outAmt > 0) {
    if (desc.includes('홍승균')) hongOut += outAmt;
    if (isInternalTransfer) {
      totalInternalOut += outAmt;
      monthlyData[ym].internalOut += outAmt;
    } else {
      totalPureExpense += outAmt;
      monthlyData[ym].pureExpense += outAmt;
      if (category === '변동지출:카드생활비') monthlyData[ym].cardExpense += outAmt;
      else if (category === '고정지출:보장성보험료') monthlyData[ym].insuranceExpense += outAmt;
      else if (category === '고정지출:배우자생활비') monthlyData[ym].wifeExpense += outAmt;
      else if (category === '고정지출:부모님용돈') monthlyData[ym].parentsExpense += outAmt;
      else if (category === '변동지출:자녀교육/용돈') monthlyData[ym].childExpense += outAmt;
      else if (category === '비정기지출:경조사비') monthlyData[ym].eventExpense += outAmt;
      else {
        monthlyData[ym].otherExpense += outAmt;
      }
    }
  }

  if (inAmt > 0) {
    if (category === '수입:근로소득(급여)') {
      totalSalary += inAmt;
      monthlyData[ym].salary += inAmt;
    } else if (isInternalTransfer) {
      monthlyData[ym].internalIn += inAmt;
    } else {
      monthlyData[ym].otherIncome += inAmt;
    }
  }
}

const months = Object.keys(monthlyData).sort();
console.log('--- 정제된 분석 결과 ---');
console.log('유효 개월 수:', months.length, '(', months[0], '~', months[months.length - 1], ')');
console.log('홍승균 출금 합계:', (hongOut / 100000000).toFixed(2) + '억 원');
console.log('총 자산이동(출금):', (totalInternalOut / 100000000).toFixed(2) + '억 원');

// 연도별 집계
let yearly = {};
for (const ym of months) {
  const y = ym.substring(0, 4);
  if (!yearly[y]) yearly[y] = { salary: 0, pureExpense: 0, cardExpense: 0, months: 0 };
  yearly[y].salary += monthlyData[ym].salary;
  yearly[y].pureExpense += monthlyData[ym].pureExpense;
  yearly[y].cardExpense += monthlyData[ym].cardExpense;
  yearly[y].months += 1;
}

console.log('\n연도별 현황:');
for (const y of Object.keys(yearly).sort()) {
  const d = yearly[y];
  const avgSal = Math.round(d.salary / d.months);
  const avgExp = Math.round(d.pureExpense / d.months);
  const surplus = avgSal - avgExp;
  const rate = avgSal > 0 ? ((surplus / avgSal) * 100).toFixed(1) : 0;
  console.log(`${y}년 (${d.months}개월): 월평균급여 ${Math.round(avgSal/10000)}만원 | 월실질지출 ${Math.round(avgExp/10000)}만원 | 월잉여 ${Math.round(surplus/10000)}만원 | 저축률 ${rate}%`);
}

// 기타 지출 내역 중 큰 것 확인
console.log('\n비정기지출:기타송금 상위 5건:');
let otherOuts = [];
for (let i = 5; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[0]) continue;
  const txDatetime = String(row[0]).trim();
  if (!txDatetime.match(/^\d{4}-\d{2}-\d{2}/)) continue;
  const txType = String(row[1] || '').trim();
  const desc = String(row[2] || '').trim();
  const outAmt = Number(row[3]) || 0;
  const inAmt = Number(row[4]) || 0;
  const { category, isInternalTransfer } = classifyTransaction(txType, desc, inAmt, outAmt);
  if (category === '비정기지출:기타송금' && outAmt > 0) {
    otherOuts.push({ date: txDatetime, desc, outAmt });
  }
}
otherOuts.sort((a,b) => b.outAmt - a.outAmt);
console.log(otherOuts.slice(0, 5));


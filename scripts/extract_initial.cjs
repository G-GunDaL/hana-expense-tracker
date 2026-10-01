const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '다운로드', 'lastTransactionDetailInquiry_20261001.xls');
const wb = XLSX.readFile(filePath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

function classifyTransaction(row) {
  const { txDatetime, txType, desc, inAmt, outAmt } = row;
  const d = (desc || '').trim();
  const t = (txType || '').trim();

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
    if (d.includes('홍승균') || d.includes('미래에셋') || t.includes('청약') || d.includes('32191024741125')) {
      return { category: '자산이동:저축투자', isInternalTransfer: true };
    }

    // B. 카드 대금 (월 생활비)
    if (d.includes('현대카드') || d.includes('신한카드')) {
      return { category: '변동지출:카드생활비', isInternalTransfer: false };
    }

    // C. 보장성 보험료
    if (t.includes('보험료') || ['삼성생명', '메리츠', '현대해상', '흥화', 'IMLI', 'DGBL', 'Abllife'].some(k => d.includes(k))) {
      return { category: '고정지출:보장성보험료', isInternalTransfer: false };
    }

    // D. 자녀 교육비 및 간편결제
    if (['청주페이', '네이버페이', '카카오페이', '홍지연', '홍지성'].some(k => d.includes(k))) {
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
    if (['홍승재', '김철', '유병옥'].some(k => d.includes(k))) {
      return { category: '비정기지출:경조사비', isInternalTransfer: false };
    }

    return { category: '비정기지출:기타송금', isInternalTransfer: false };
  }

  return { category: '기타', isInternalTransfer: false };
}

let list = [];
let seen = new Set();
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

  const key = `${txDatetime}_${desc}_${outAmt}_${inAmt}_${balance}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const { category, isInternalTransfer } = classifyTransaction({
    txDatetime,
    txType,
    desc,
    inAmt,
    outAmt
  });

  list.push({
    id: `tx_${list.length + 1}`,
    txDatetime,
    txType,
    desc,
    outAmt,
    inAmt,
    balance,
    branch,
    category,
    isInternalTransfer,
    memo: ''
  });
}

const outDir = path.join(__dirname, '..', 'src', 'data');
const outFile = path.join(outDir, 'initialTransactions.json');
fs.writeFileSync(outFile, JSON.stringify(list, null, 2), 'utf-8');
console.log('Successfully regenerated initialTransactions.json with', list.length, 'records');

// 카테고리별 건수 및 합계 확인
let catCount = {};
for (const item of list) {
  catCount[item.category] = (catCount[item.category] || 0) + 1;
}
console.log('Category breakdown:', catCount);

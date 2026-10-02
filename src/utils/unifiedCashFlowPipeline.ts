import { ParsedTx, CardStatementTx, UnifiedMonthlyData, EducationDetailTx } from '../types/finance';

/**
 * 1. 은행 거래 중 카드대금 결제 여부 판별 (이중 계산 방지 규칙)
 * 은행 계좌 거래 중 적요/거래처에 현대카드, 카드대금, 현대카드결제 등이 포함된 출금 건은 지출 합계에서 자동 제외
 */
export function isBankCardPayment(desc: string, category: string = ''): boolean {
  const d = (desc || '').trim();
  const c = (category || '').trim();
  if (/현대카드|카드대금|현대카드결제|신한카드/i.test(d)) return true;
  if (c === '변동지출:카드생활비') return true;
  return false;
}

/**
 * 2. 은행 거래 중 청주페이 충전 여부 판별 (자녀 교육비 이원화 규칙)
 */
export function isBankCheongjuPay(desc: string): boolean {
  return (desc || '').includes('청주페이');
}

/**
 * 3. 은행 거래 중 고정비 여부 판별
 * 정기 공과금, 보험료, 배우자생활비, 부모님 정기용돈, 대출이자 등
 */
export function isBankFixedExpense(desc: string, category: string = ''): boolean {
  const c = (category || '').trim();
  const d = (desc || '').trim();

  if (
    c === '고정지출:보장성보험료' ||
    c === '고정지출:배우자생활비' ||
    c === '고정지출:부모님정기용돈'
  ) {
    return true;
  }

  return /보험|삼성생명|메리츠|현대해상|흥화|IMLI|DGBL|Abllife|김소영|홍정수|이길자|대출|이자|공과금/i.test(d);
}

/**
 * 4. 카드 거래 중 고정비 여부 판별 (카드 고정결제 규칙)
 * 아파트관리비, 통신비(LG유플러스), 충청에너지(도시가스), 쿠쿠홈시스(렌탈), 지방세
 */
export function isCardFixedExpense(merchant: string, category: string = ''): boolean {
  const m = (merchant || '').trim();
  const c = (category || '').trim();

  if (c === '주거/공과금' || c === '통신비' || c === '생활렌탈/구독') {
    return true;
  }

  return /아파트관리비|도시가스|충청에너지|지방세|LG유플러스|LGU\+|통신요|통신비|쿠쿠홈시스|렌탈/i.test(m);
}

/**
 * 5. 카드 거래 중 학원비 여부 판별 (자녀 학원비 규칙)
 * 센트럴영어수학, 한신태권도, JK제이케이, 요가, 학원 등
 */
export function isCardAcademyExpense(merchant: string, category: string = ''): boolean {
  const m = (merchant || '').trim();
  const c = (category || '').trim();

  if (c === '교육/학원') return true;
  return /학원|태권도|영어수학|요가|센트럴영어|한신태권도|JK제이케이|트리코나/i.test(m);
}

/**
 * 통합 현금흐름 파이프라인 (방식 A 적용)
 * 은행 입출금 데이터와 현대카드 명세서 데이터를 통합하여
 * 이중 계산 없이 전체 가계 현금흐름(4단계 공식)을 산출합니다.
 */
export function calculateUnifiedCashFlow(
  bankTransactions: ParsedTx[] = [],
  cardTransactions: CardStatementTx[] = []
): UnifiedMonthlyData[] {
  // 모바일/비동기 방어 코드: 빈 배열 및 null 가드
  const safeBank = Array.isArray(bankTransactions) ? bankTransactions : [];
  const safeCard = Array.isArray(cardTransactions) ? cardTransactions : [];

  if (safeBank.length === 0 && safeCard.length === 0) {
    return [];
  }

  // 모든 고유 연월 (YYYY-MM) 수집
  const monthsSet = new Set<string>();

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
  const result: UnifiedMonthlyData[] = [];

  for (const ym of sortedMonths) {
    // -------------------------------------------------------------
    // A. 해당 월 은행 거래 데이터 집계
    // -------------------------------------------------------------
    const monthBankTxs = safeBank.filter(tx => tx && tx.txDatetime && tx.txDatetime.startsWith(ym));

    let salaryIncome = 0;
    let otherIncome = 0;
    let bankFixed = 0;
    let eduCheongjuPay = 0;
    let excludedCardTransferAmt = 0;
    let bankOtherExpense = 0;

    const bankFixedDetails = {
      insurance: 0,
      spouseLiving: 0,
      parentsAllowance: 0,
      otherFixed: 0
    };

    for (const tx of monthBankTxs) {
      const inAmt = Number(tx.inAmt) || 0;
      const outAmt = Number(tx.outAmt) || 0;
      const desc = tx.desc || '';
      const cat = tx.category || '';
      const isInternal = Boolean(tx.isInternalTransfer);

      // 입금 처리 (자산 간 이동 격리 제외)
      if (inAmt > 0) {
        if (cat === '수입:근로소득(급여)' || desc.includes('급여') || (tx.txType && tx.txType.includes('급여'))) {
          salaryIncome += inAmt;
        } else if (!isInternal) {
          otherIncome += inAmt;
        }
      }

      // 출금 처리
      if (outAmt > 0) {
        // 자산이동(저축/투자) 격리
        if (isInternal) {
          continue;
        }

        // 규칙 1: 카드대금 결제 출금액 이중계산 방지 (is_transfer: true 마킹 및 지출 제외)
        if (isBankCardPayment(desc, cat)) {
          excludedCardTransferAmt += outAmt;
          continue;
        }

        // 규칙 3: 청주페이는 전액 [교육/학원비]로 편입
        if (isBankCheongjuPay(desc)) {
          eduCheongjuPay += outAmt;
          continue;
        }

        // 규칙 2: 은행 고정비 (보험료, 배우자생활비, 부모님용돈 등)
        if (isBankFixedExpense(desc, cat)) {
          bankFixed += outAmt;
          if (cat === '고정지출:보장성보험료' || /보험|삼성생명|메리츠|현대해상/i.test(desc)) {
            bankFixedDetails.insurance += outAmt;
          } else if (cat === '고정지출:배우자생활비' || desc.includes('김소영')) {
            bankFixedDetails.spouseLiving += outAmt;
          } else if (cat === '고정지출:부모님정기용돈' || /홍정수|이길자/i.test(desc)) {
            bankFixedDetails.parentsAllowance += outAmt;
          } else {
            bankFixedDetails.otherFixed += outAmt;
          }
          continue;
        }

        // 기타 은행 비정기 지출 (경조사비, 기타송금 등)
        bankOtherExpense += outAmt;
      }
    }

    const totalIncome = salaryIncome + otherIncome;

    // -------------------------------------------------------------
    // B. 해당 월 현대카드 명세서 데이터 집계
    // -------------------------------------------------------------
    const monthCardTxs = safeCard.filter(tx => {
      if (!tx) return false;
      const m = tx.statementMonth || (tx.txDate ? tx.txDate.substring(0, 7) : '');
      return m === ym;
    });

    let cardFixed = 0;
    let cardPureVariable = 0;
    let eduCardAcademy = 0;

    const cardFixedDetails = {
      apartmentMaintenance: 0,
      telecom: 0,
      cityGas: 0,
      rental: 0,
      localTax: 0
    };

    // 도넛 차트용 카테고리 누적액
    let donutOnlineShopping = 0;
    let donutFoodDining = 0;
    let donutTransportVehicle = 0;

    for (const tx of monthCardTxs) {
      const amt = Number(tx.amount) || 0;
      if (amt <= 0) continue;

      const merchant = tx.merchant || '';
      const category = tx.category || '';

      // 규칙 2: 카드 결제 고정비 (관리비, 통신비, 도시가스, 렌탈, 지방세)
      if (isCardFixedExpense(merchant, category)) {
        cardFixed += amt;
        if (/아파트관리비/i.test(merchant)) {
          cardFixedDetails.apartmentMaintenance += amt;
        } else if (/LG유플러스|LGU\+|통신/i.test(merchant) || category === '통신비') {
          cardFixedDetails.telecom += amt;
        } else if (/충청에너지|도시가스/i.test(merchant)) {
          cardFixedDetails.cityGas += amt;
        } else if (/쿠쿠홈시스|렌탈/i.test(merchant) || category === '생활렌탈/구독') {
          cardFixedDetails.rental += amt;
        } else if (/지방세/i.test(merchant)) {
          cardFixedDetails.localTax += amt;
        }
        continue;
      }

      // 규칙 3: 카드 결제 학원비 (센트럴영어수학, 한신태권도, JK, 요가 등)
      if (isCardAcademyExpense(merchant, category)) {
        eduCardAcademy += amt;
        continue;
      }

      // 규칙 4: 카드 순수 변동 소비 (쇼핑/외식/마트/교통 등)
      cardPureVariable += amt;

      // 도넛 세부 분류
      if (category === '온라인쇼핑' || /쿠팡|네이버페이|쇼핑|G마켓|옥션|에이블리/i.test(merchant)) {
        donutOnlineShopping += amt;
      } else if (
        category === '외식/식당' ||
        category === '배달음식' ||
        category === '마트/편의점' ||
        category === '카페/베이커리' ||
        /식당|배달|마트|편의점|카페|스타벅스|치킨|갈비/i.test(merchant)
      ) {
        donutFoodDining += amt;
      } else {
        // 교통, 차량, 하이패스, 의료, 문화, 기타
        donutTransportVehicle += amt;
      }
    }

    // -------------------------------------------------------------
    // C. 4단계 통합 현금흐름 공식 산출
    // -------------------------------------------------------------
    // 1) 고정비 (은행 고정 출금 + 카드 고정결제)
    const totalFixed = bankFixed + cardFixed;

    // 2) 통합 자녀 교육비 (청주페이 충전액 + 카드 학원비)
    const totalEduExpense = eduCheongjuPay + eduCardAcademy;

    // 3) 변동생활비 (카드 순수소비 + 자녀 교육비 + 은행 기타 송금)
    const totalVariable = cardPureVariable + totalEduExpense + bankOtherExpense;

    // 4) 총지출 & 잉여현금 & 저축가능률
    const totalExpense = totalFixed + totalVariable;
    const netSurplus = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Number(((netSurplus / totalIncome) * 100).toFixed(1)) : 0;
    const isDeficit = netSurplus < 0;

    // 도넛 차트 5대 카테고리 구성
    const donutCategories = {
      fixed: totalFixed,
      education: totalEduExpense,
      onlineShopping: donutOnlineShopping,
      foodDining: donutFoodDining,
      transportVehicle: donutTransportVehicle + bankOtherExpense
    };

    result.push({
      yearMonth: ym,
      totalIncome,
      salaryIncome,
      otherIncome,
      totalFixed,
      bankFixed,
      cardFixed,
      fixedDetails: {
        apartmentMaintenance: cardFixedDetails.apartmentMaintenance,
        telecom: cardFixedDetails.telecom,
        cityGas: cardFixedDetails.cityGas,
        rental: cardFixedDetails.rental,
        localTax: cardFixedDetails.localTax,
        insurance: bankFixedDetails.insurance,
        spouseLiving: bankFixedDetails.spouseLiving,
        parentsAllowance: bankFixedDetails.parentsAllowance,
        otherFixed: bankFixedDetails.otherFixed
      },
      totalVariable,
      cardPureVariable,
      totalEduExpense,
      eduCheongjuPay,
      eduCardAcademy,
      bankOtherExpense,
      donutCategories,
      netSurplus,
      totalExpense,
      savingsRate,
      isDeficit,
      bankTxCount: monthBankTxs.length,
      cardTxCount: monthCardTxs.length,
      excludedCardTransferAmt
    });
  }

  return result;
}

/**
 * 기간(특정 월, 최근 1년, 전체)에 따른 자녀 교육비 상세 드릴다운 거래 내역 추출
 * (청주페이 충전 건 + 현대카드 학원 결제 건)
 */
export function getEducationDetailTransactions(
  selectedPeriod: string,
  bankTransactions: ParsedTx[] = [],
  cardTransactions: CardStatementTx[] = [],
  recent12Months: string[] = []
): EducationDetailTx[] {
  const safeBank = Array.isArray(bankTransactions) ? bankTransactions : [];
  const safeCard = Array.isArray(cardTransactions) ? cardTransactions : [];

  const list: EducationDetailTx[] = [];

  const isIncludedMonth = (ym: string) => {
    if (!selectedPeriod || selectedPeriod === 'ALL') return true;
    if (selectedPeriod === '1YEAR') {
      if (recent12Months.length > 0) return recent12Months.includes(ym);
      return true;
    }
    return ym === selectedPeriod;
  };

  // 은행 청주페이 거래 추출
  safeBank.forEach(tx => {
    if (!tx || !tx.txDatetime) return;
    const ym = tx.txDatetime.substring(0, 7);
    if (!isIncludedMonth(ym)) return;
    if (isBankCheongjuPay(tx.desc) && (Number(tx.outAmt) || 0) > 0) {
      list.push({
        id: tx.id || `edu_bank_${Math.random()}`,
        date: tx.txDatetime.substring(0, 10),
        source: '청주페이',
        title: '청주페이 충전 (지역화폐/학원비)',
        amount: Number(tx.outAmt) || 0,
        memo: tx.memo || tx.desc
      });
    }
  });

  // 현대카드 학원 결제 내역 추출
  safeCard.forEach(tx => {
    if (!tx) return;
    const m = tx.statementMonth || (tx.txDate ? tx.txDate.substring(0, 7) : '');
    if (!isIncludedMonth(m)) return;
    if (isCardAcademyExpense(tx.merchant, tx.category) && (Number(tx.amount) || 0) > 0) {
      list.push({
        id: tx.id || `edu_card_${Math.random()}`,
        date: tx.txDate,
        source: '현대카드',
        title: tx.normalizedMerchant || tx.merchant,
        amount: Number(tx.amount) || 0,
        memo: `${tx.cardName} (${tx.cardOwner})`
      });
    }
  });

  // 날짜 역순 정렬 (최신순)
  return list.sort((a, b) => b.date.localeCompare(a.date));
}

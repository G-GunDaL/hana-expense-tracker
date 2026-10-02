import React, { useState, useMemo } from 'react';
import {
  ParsedTx,
  CardStatementTx,
  UnifiedMonthlyData,
  EducationDetailTx
} from '../types/finance';
import {
  calculateUnifiedCashFlow,
  getEducationDetailTransactions
} from '../utils/unifiedCashFlowPipeline';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
  Area,
  ComposedChart,
  Line
} from 'recharts';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Layers,
  GraduationCap,
  CreditCard,
  Building,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Receipt,
  Calendar,
  BarChart3
} from 'lucide-react';

interface UnifiedCashFlowViewProps {
  bankTransactions?: ParsedTx[];
  cardTransactions?: CardStatementTx[];
  onOpenFileUpload?: () => void;
  onOpenCardUpload?: () => void;
}

// 도넛 차트 색상 매핑
const DONUT_COLORS = {
  fixed: '#f59e0b', // 앰버 (고정비)
  education: '#ec4899', // 핑크 (자녀 교육비)
  onlineShopping: '#e60050', // 하나 레드 (온라인 쇼핑)
  foodDining: '#10b981', // 에메랄드 (식비/마트/외식)
  transportVehicle: '#3b82f6' // 블루 (교통/차량/기타)
};

export const UnifiedCashFlowView: React.FC<UnifiedCashFlowViewProps> = ({
  bankTransactions = [],
  cardTransactions = [],
  onOpenFileUpload,
  onOpenCardUpload
}) => {
  // 모바일/비동기 방어 가드
  const safeBank: ParsedTx[] = Array.isArray(bankTransactions) ? bankTransactions : [];
  const safeCard: CardStatementTx[] = Array.isArray(cardTransactions) ? cardTransactions : [];

  // 통합 현금흐름 월별 데이터 연산
  const unifiedData: UnifiedMonthlyData[] = useMemo(() => {
    try {
      return calculateUnifiedCashFlow(safeBank, safeCard);
    } catch (e) {
      console.error('Unified cash flow calculation failed:', e);
      return [];
    }
  }, [safeBank, safeCard]);

  // 가용 연월 목록 (최신순)
  const availableMonths = useMemo(() => {
    return unifiedData.map(d => d.yearMonth).reverse();
  }, [unifiedData]);

  // 기간 선택 상태 ('1YEAR' | 'ALL' | 'YYYY-MM')
  // 기본값: '1YEAR' (최근 1년 누적 및 월평균이 즉시 노출)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1YEAR');

  // 금액 포맷터 헬퍼 (억/만 원 단위 직관 포맷)
  const formatMoney = (amount: number = 0): string => {
    const val = Math.round(Number(amount) || 0);
    const absVal = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (absVal >= 100000000) {
      const eok = Math.floor(absVal / 100000000);
      const remainderMan = Math.round((absVal % 100000000) / 10000);
      if (remainderMan === 0) return `${sign}${eok}억 원`;
      return `${sign}${eok}억 ${remainderMan.toLocaleString()}만 원`;
    }
    const manwon = Math.round(val / 10000);
    return `${manwon.toLocaleString()}만 원`;
  };

  const formatWon = (amount: number = 0) => {
    return `${(Number(amount) || 0).toLocaleString()}원`;
  };

  // -------------------------------------------------------------
  // 집계 및 월평균 계산 로직 (useMemo)
  // 유효 개월 수(Active Months Count)를 기반으로 정확한 월평균 산출
  // -------------------------------------------------------------
  const cashflowSummary = useMemo(() => {
    let targetMonths: UnifiedMonthlyData[] = [];
    let periodLabel = '';
    let isAggregate = false;

    if (selectedPeriod === 'ALL') {
      targetMonths = unifiedData;
      periodLabel = `전체 기간 누적 (${targetMonths.length}개월)`;
      isAggregate = true;
    } else if (selectedPeriod === '1YEAR') {
      targetMonths = unifiedData.slice(-12);
      periodLabel = `최근 1년치 누적 (${targetMonths.length}개월)`;
      isAggregate = true;
    } else {
      const found = unifiedData.find(d => d.yearMonth === selectedPeriod);
      targetMonths = found ? [found] : (unifiedData.length > 0 ? [unifiedData[unifiedData.length - 1]] : []);
      periodLabel = `${selectedPeriod.replace('-', '년 ')}월`;
      isAggregate = false;
    }

    // 유효 개월 수 (0으로 나누기 원천 방지)
    const uniqueMonths = new Set(targetMonths.map(d => d.yearMonth).filter(Boolean));
    const monthsCount = Math.max(uniqueMonths.size, 1);

    // 1. 총합 계산
    let totalIncome = 0;
    let salaryIncome = 0;
    let otherIncome = 0;
    let totalFixed = 0;
    let bankFixed = 0;
    let cardFixed = 0;
    let totalVariable = 0;
    let cardPureVariable = 0;
    let totalEducation = 0;
    let eduCheongjuPay = 0;
    let eduCardAcademy = 0;
    let bankOtherExpense = 0;
    let excludedCardTransferAmt = 0;
    let bankTxCount = 0;
    let cardTxCount = 0;

    const fixedDetails = {
      apartmentMaintenance: 0,
      telecom: 0,
      cityGas: 0,
      rental: 0,
      localTax: 0,
      insurance: 0,
      spouseLiving: 0,
      parentsAllowance: 0,
      otherFixed: 0
    };

    const donutCategories = {
      fixed: 0,
      education: 0,
      onlineShopping: 0,
      foodDining: 0,
      transportVehicle: 0
    };

    targetMonths.forEach(m => {
      totalIncome += Number(m.totalIncome) || 0;
      salaryIncome += Number(m.salaryIncome) || 0;
      otherIncome += Number(m.otherIncome) || 0;
      totalFixed += Number(m.totalFixed) || 0;
      bankFixed += Number(m.bankFixed) || 0;
      cardFixed += Number(m.cardFixed) || 0;
      totalVariable += Number(m.totalVariable) || 0;
      cardPureVariable += Number(m.cardPureVariable) || 0;
      totalEducation += Number(m.totalEduExpense) || 0;
      eduCheongjuPay += Number(m.eduCheongjuPay) || 0;
      eduCardAcademy += Number(m.eduCardAcademy) || 0;
      bankOtherExpense += Number(m.bankOtherExpense) || 0;
      excludedCardTransferAmt += Number(m.excludedCardTransferAmt) || 0;
      bankTxCount += Number(m.bankTxCount) || 0;
      cardTxCount += Number(m.cardTxCount) || 0;

      fixedDetails.apartmentMaintenance += Number(m.fixedDetails.apartmentMaintenance) || 0;
      fixedDetails.telecom += Number(m.fixedDetails.telecom) || 0;
      fixedDetails.cityGas += Number(m.fixedDetails.cityGas) || 0;
      fixedDetails.rental += Number(m.fixedDetails.rental) || 0;
      fixedDetails.localTax += Number(m.fixedDetails.localTax) || 0;
      fixedDetails.insurance += Number(m.fixedDetails.insurance) || 0;
      fixedDetails.spouseLiving += Number(m.fixedDetails.spouseLiving) || 0;
      fixedDetails.parentsAllowance += Number(m.fixedDetails.parentsAllowance) || 0;
      fixedDetails.otherFixed += Number(m.fixedDetails.otherFixed) || 0;

      donutCategories.onlineShopping += Number(m.donutCategories.onlineShopping) || 0;
      donutCategories.foodDining += Number(m.donutCategories.foodDining) || 0;
      donutCategories.transportVehicle += Number(m.donutCategories.transportVehicle) || 0;
    });

    donutCategories.fixed = totalFixed;
    donutCategories.education = totalEducation;

    const totalExpense = totalFixed + totalVariable;
    const totalSurplus = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((totalSurplus / totalIncome) * 100) : 0;
    const isDeficit = totalSurplus < 0;

    // 2. 월평균 계산 (개별 월 선택 시에는 개월수가 1이므로 총합 = 평균)
    const avgIncome = Math.round(totalIncome / monthsCount);
    const avgSalary = Math.round(salaryIncome / monthsCount);
    const avgOtherIncome = Math.round(otherIncome / monthsCount);
    const avgFixed = Math.round(totalFixed / monthsCount);
    const avgBankFixed = Math.round(bankFixed / monthsCount);
    const avgCardFixed = Math.round(cardFixed / monthsCount);
    const avgVariable = Math.round(totalVariable / monthsCount);
    const avgCardPureVariable = Math.round(cardPureVariable / monthsCount);
    const avgEducation = Math.round(totalEducation / monthsCount);
    const avgCheongjuPay = Math.round(eduCheongjuPay / monthsCount);
    const avgCardAcademy = Math.round(eduCardAcademy / monthsCount);
    const avgSurplus = Math.round(totalSurplus / monthsCount);
    const avgExpense = Math.round(totalExpense / monthsCount);

    const avgFixedDetails = {
      apartmentMaintenance: Math.round(fixedDetails.apartmentMaintenance / monthsCount),
      telecom: Math.round(fixedDetails.telecom / monthsCount),
      cityGas: Math.round(fixedDetails.cityGas / monthsCount),
      rental: Math.round(fixedDetails.rental / monthsCount),
      localTax: Math.round(fixedDetails.localTax / monthsCount),
      insurance: Math.round(fixedDetails.insurance / monthsCount),
      spouseLiving: Math.round(fixedDetails.spouseLiving / monthsCount),
      parentsAllowance: Math.round(fixedDetails.parentsAllowance / monthsCount),
      otherFixed: Math.round(fixedDetails.otherFixed / monthsCount)
    };

    return {
      periodLabel,
      isAggregate,
      monthsCount,
      total: {
        income: totalIncome,
        salary: salaryIncome,
        otherIncome,
        fixed: totalFixed,
        bankFixed,
        cardFixed,
        variable: totalVariable,
        cardPureVariable,
        education: totalEducation,
        cheongjuPay: eduCheongjuPay,
        cardAcademy: eduCardAcademy,
        bankOther: bankOtherExpense,
        surplus: totalSurplus,
        expense: totalExpense,
        fixedDetails,
        donutCategories,
        excludedCardTransferAmt,
        bankTxCount,
        cardTxCount
      },
      avg: {
        income: avgIncome,
        salary: avgSalary,
        otherIncome: avgOtherIncome,
        fixed: avgFixed,
        bankFixed: avgBankFixed,
        cardFixed: avgCardFixed,
        variable: avgVariable,
        cardPureVariable: avgCardPureVariable,
        education: avgEducation,
        cheongjuPay: avgCheongjuPay,
        cardAcademy: avgCardAcademy,
        surplus: avgSurplus,
        expense: avgExpense,
        fixedDetails: avgFixedDetails
      },
      savingsRate,
      isDeficit
    };
  }, [unifiedData, selectedPeriod]);

  // 최근 12개월 연월 목록 (자녀 교육비 드릴다운 필터용)
  const recent12MonthsList = useMemo(() => {
    return unifiedData.slice(-12).map(d => d.yearMonth);
  }, [unifiedData]);

  // 자녀 교육비 상세 거래 내역
  const educationDetails: EducationDetailTx[] = useMemo(() => {
    return getEducationDetailTransactions(selectedPeriod, safeBank, safeCard, recent12MonthsList);
  }, [selectedPeriod, safeBank, safeCard, recent12MonthsList]);

  // 교육비 드릴다운 보기 모드 ('all' | 'cheongju' | 'card')
  const [eduFilter, setEduFilter] = useState<'all' | 'cheongju' | 'card'>('all');
  const filteredEduDetails = useMemo(() => {
    if (eduFilter === 'cheongju') {
      return educationDetails.filter(d => d.source === '청주페이');
    }
    if (eduFilter === 'card') {
      return educationDetails.filter(d => d.source === '현대카드');
    }
    return educationDetails;
  }, [educationDetails, eduFilter]);

  // 이전/다음 월 네비게이션 (개별 월 모드일 때 동작)
  const isIndividualMonth = selectedPeriod !== 'ALL' && selectedPeriod !== '1YEAR';

  const handlePrevMonth = () => {
    if (!isIndividualMonth) {
      if (availableMonths.length > 0) setSelectedPeriod(availableMonths[0]);
      return;
    }
    const idx = availableMonths.indexOf(selectedPeriod);
    if (idx < availableMonths.length - 1) {
      setSelectedPeriod(availableMonths[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    if (!isIndividualMonth) {
      if (availableMonths.length > 0) setSelectedPeriod(availableMonths[0]);
      return;
    }
    const idx = availableMonths.indexOf(selectedPeriod);
    if (idx > 0) {
      setSelectedPeriod(availableMonths[idx - 1]);
    }
  };

  // 1. 수입 배분 워터폴 / 누적 바 차트 데이터
  const waterfallChartData = useMemo(() => {
    const s = cashflowSummary;
    const income = s.total.income;
    const fixed = s.total.fixed;
    const variable = s.total.variable;
    const surplus = s.total.surplus;

    return [
      {
        name: '가계 총수입',
        수입: income,
        고정비: 0,
        변동생활비: 0,
        잉여현금: 0
      },
      {
        name: '지출 및 잉여 배분',
        수입: 0,
        고정비: fixed,
        변동생활비: variable,
        잉여현금: surplus > 0 ? surplus : 0
      }
    ];
  }, [cashflowSummary]);

  // 2. 통합 지출 구조 도넛 차트 데이터
  const donutChartData = useMemo(() => {
    const cats = cashflowSummary.total.donutCategories;
    const totalExp = Number(cashflowSummary.total.expense) || 1;

    const data = [
      {
        name: '고정비(관리/통신/공과금/보험)',
        value: Number(cats.fixed) || 0,
        color: DONUT_COLORS.fixed
      },
      {
        name: '자녀 교육비(청주페이+학원)',
        value: Number(cats.education) || 0,
        color: DONUT_COLORS.education
      },
      {
        name: '온라인 쇼핑(쿠팡/이커머스)',
        value: Number(cats.onlineShopping) || 0,
        color: DONUT_COLORS.onlineShopping
      },
      {
        name: '식비/마트/외식/카페/배달',
        value: Number(cats.foodDining) || 0,
        color: DONUT_COLORS.foodDining
      },
      {
        name: '교통/차량/기타 소비',
        value: Number(cats.transportVehicle) || 0,
        color: DONUT_COLORS.transportVehicle
      }
    ].filter(item => item.value > 0);

    return data.map(item => ({
      ...item,
      ratio: Number(((item.value / totalExp) * 100).toFixed(1))
    }));
  }, [cashflowSummary]);

  // 3. 1년치(최근 12개월) 월별 잉여현금 추이 꺾은선 차트 데이터
  const trendChartData = useMemo(() => {
    const recent12 = unifiedData.slice(-12);
    return recent12.map(d => ({
      month: d.yearMonth.substring(2).replace('-', '년 ') + '월',
      rawMonth: d.yearMonth,
      총수입: Math.round((Number(d.totalIncome) || 0) / 10000),
      총지출: Math.round((Number(d.totalExpense) || 0) / 10000),
      잉여현금: Math.round((Number(d.netSurplus) || 0) / 10000),
      저축률: Number(d.savingsRate) || 0
    }));
  }, [unifiedData]);

  // 4. 자녀 교육비 12개월 추이 차트 데이터 (청주페이 vs 카드 학원비)
  const eduTrendChartData = useMemo(() => {
    const recent12 = unifiedData.slice(-12);
    return recent12.map(d => ({
      month: d.yearMonth.substring(2).replace('-', '년 ') + '월',
      청주페이: Math.round((Number(d.eduCheongjuPay) || 0) / 10000),
      카드학원비: Math.round((Number(d.eduCardAcademy) || 0) / 10000),
      통합교육비: Math.round((Number(d.totalEduExpense) || 0) / 10000)
    }));
  }, [unifiedData]);

  // 연간 누적 자녀 교육비
  const annualTotalEdu = useMemo(() => {
    const recent12 = unifiedData.slice(-12);
    return recent12.reduce((acc, curr) => acc + (Number(curr.totalEduExpense) || 0), 0);
  }, [unifiedData]);

  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* ------------------------------------------------------------- */}
      {/* 최상단: 대시보드 타이틀 & 기간 선택기 (Period Selector) 확장    */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-glass">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 p-[1px] flex items-center justify-center shadow-md shadow-brand-500/20">
              <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                <Layers className="w-5 h-5 text-brand-400" />
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                통합 현금흐름 (All-in-One)
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {cashflowSummary.periodLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                하나은행 입출금과 현대카드 승인 내역을 이중 계산 없이 실시간 1:1 통합
              </p>
            </div>
          </div>
        </div>

        {/* 기간 선택기: 최근 1년 / 전체 기간 / 개별 청구월 선택 */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* 1. 최근 1년 (최근 12개월) 버튼 */}
          <button
            onClick={() => setSelectedPeriod('1YEAR')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedPeriod === '1YEAR'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>최근 1년 (12개월)</span>
          </button>

          {/* 2. 전체 기간 누적 (ALL) 버튼 */}
          <button
            onClick={() => setSelectedPeriod('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedPeriod === 'ALL'
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 ring-1 ring-brand-400'
                : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>전체 누적 (ALL)</span>
          </button>

          {/* 3. 개별 청구월 선택 드롭다운 & 네비게이터 */}
          <div className="flex items-center space-x-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={handlePrevMonth}
              disabled={!isIndividualMonth || availableMonths.indexOf(selectedPeriod) >= availableMonths.length - 1}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={isIndividualMonth ? selectedPeriod : ''}
              onChange={e => {
                if (e.target.value) setSelectedPeriod(e.target.value);
              }}
              className={`bg-transparent text-xs sm:text-sm font-bold px-2 py-1 focus:outline-none cursor-pointer ${
                isIndividualMonth ? 'text-brand-300 font-extrabold' : 'text-slate-400 font-normal'
              }`}
            >
              <option value="" disabled className="bg-slate-900 text-slate-500">
                개별 청구월 선택
              </option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym} className="bg-slate-900 text-white">
                  {ym.replace('-', '년 ')}월
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              disabled={!isIndividualMonth || availableMonths.indexOf(selectedPeriod) <= 0}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 파이프라인 무결성 & 카드대금 이중 계산 방지 안내 배너           */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl bg-gradient-to-r from-brand-900/30 via-slate-900/80 to-purple-900/30 border border-brand-500/30 p-3.5 sm:p-4 text-xs flex flex-wrap items-center justify-between gap-3 shadow-glass">
        <div className="flex items-center space-x-2.5 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
          <span>
            <strong className="text-white">이중 계산 자동 격리 완벽 적용:</strong> {cashflowSummary.periodLabel} 동안 은행 계좌에서 출금된 현대카드 결제액 총{' '}
            <strong className="text-brand-300 font-mono">
              {formatMoney(cashflowSummary.total.excludedCardTransferAmt)}
            </strong>
            을 지출 합계에서 완전 차감하고, 현대카드 실시간 승인 내역({cashflowSummary.total.cardTxCount.toLocaleString()}건)으로 100% 정밀 대체 집계했습니다.
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            무결성 보증 ({cashflowSummary.monthsCount}개월)
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. UI 카드 레이아웃 업데이트 (합계 + 월평균 동시 노출)           */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 총수입 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-brand-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. 총수입 (순수 입금)
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {/* 메인 금액: 총 합계 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.income)}
            </div>

            {/* 보조 뱃지 / 서브텍스트: 월평균 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg px-2.5 py-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span>
                월평균 <strong className="text-white font-bold">{formatMoney(cashflowSummary.avg.income)}</strong>
                {cashflowSummary.isAggregate && (
                  <span className="text-slate-400 font-normal"> (총 {cashflowSummary.monthsCount}개월 기준)</span>
                )}
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              급여 {formatMoney(cashflowSummary.total.salary)}
              {cashflowSummary.total.otherIncome > 0 && ` + 기타 ${formatMoney(cashflowSummary.total.otherIncome)}`}
            </p>
          </div>
        </div>

        {/* KPI 2: 고정비 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-amber-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. 고정비 (통합 필수비용)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {/* 메인 금액: 총 합계 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.fixed)}
            </div>

            {/* 보조 서브텍스트: 월평균 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 font-medium">
              <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                월평균 <strong className="text-white font-bold">{formatMoney(cashflowSummary.avg.fixed)}</strong>
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400 truncate">
              관리비, 통신비, 공과금, 렌탈, 보험, 정기이체 등
            </p>
          </div>
        </div>

        {/* KPI 3: 변동생활비 카드 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-rose-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. 변동생활비 (소비+교육)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {/* 메인 금액: 총 합계 */}
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.variable)}
            </div>

            {/* 보조 서브텍스트: 월평균 및 자녀 교육비 월평균 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-2.5 py-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                월평균 <strong className="text-white font-bold">{formatMoney(cashflowSummary.avg.variable)}</strong>
              </span>
            </div>

            <p className="mt-2 text-[11px] text-pink-300/90 truncate">
              자녀 교육비 월평균: <strong>{formatMoney(cashflowSummary.avg.education)}</strong>
            </p>
          </div>
        </div>

        {/* KPI 4: 잉여현금 (저축/투자 여력) 카드 */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border p-5 shadow-glass transition-all duration-300 group ${
          cashflowSummary.isDeficit
            ? 'border-red-500/40 bg-red-950/10 hover:border-red-400'
            : 'border-slate-800 hover:border-emerald-500/40'
        }`}>
          <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl transition-all ${
            cashflowSummary.isDeficit ? 'bg-red-500/10' : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
          }`}></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              4. 잉여현금 (저축/투자 여력)
            </span>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              cashflowSummary.isDeficit
                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}>
              {cashflowSummary.isDeficit ? <TrendingDown className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            {/* 메인 금액: 총 잉여현금 */}
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              cashflowSummary.isDeficit ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {cashflowSummary.isAggregate ? '총 ' : ''}{cashflowSummary.total.surplus >= 0 ? '+' : ''}{formatMoney(cashflowSummary.total.surplus)}
            </div>

            {/* 보조 서브텍스트: 월평균 및 저축성향 */}
            <div className={`mt-2.5 flex items-center space-x-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium border ${
              cashflowSummary.isDeficit
                ? 'bg-red-500/10 border-red-500/20 text-red-300'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            }`}>
              <PiggyBank className="w-3.5 h-3.5 shrink-0" />
              <span>
                월평균 <strong className="text-white font-bold">{cashflowSummary.avg.surplus >= 0 ? '+' : ''}{formatMoney(cashflowSummary.avg.surplus)}</strong> / 저축성향 <strong className="text-white font-bold">{cashflowSummary.savingsRate}%</strong>
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              총수입({formatMoney(cashflowSummary.total.income)}) - 총지출({formatMoney(cashflowSummary.total.expense)})
            </p>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* B. 시각화 섹션 (Recharts)                                      */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. 수입 배분 워터폴 / 1:1 누적 매칭 바 차트 (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-brand-400" />
                {cashflowSummary.periodLabel} 수입-지출 1:1 배분 구조
              </h3>
              <p className="text-xs text-slate-400">
                총수입 대비 고정비, 변동생활비, 잉여현금(저축여력)의 100% 매칭 구조 ({cashflowSummary.monthsCount}개월 누적 기준)
              </p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              단위: 원
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={val => {
                    const abs = Math.abs(val);
                    if (abs >= 100000000) return `${(val / 100000000).toFixed(1)}억`;
                    return `${Math.round(val / 10000)}만`;
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                          {payload.map((entry, idx) => {
                            if (Number(entry.value) <= 0) return null;
                            const totalVal = Number(entry.value);
                            const avgVal = Math.round(totalVal / cashflowSummary.monthsCount);
                            return (
                              <div key={idx} className="space-y-0.5">
                                <div className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                    {entry.name}:
                                  </span>
                                  <span className="font-bold text-white">
                                    {formatWon(totalVal)}
                                  </span>
                                </div>
                                {cashflowSummary.isAggregate && (
                                  <div className="text-[10px] text-slate-400 pl-3.5">
                                    월평균: {formatMoney(avgVal)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                  formatter={value => <span className="text-slate-300 font-medium">{value}</span>}
                />
                {/* 수입 단독 바 */}
                <Bar dataKey="수입" fill="#008485" radius={[6, 6, 0, 0]} maxBarSize={70} />
                {/* 지출 및 잉여 누적 바 */}
                <Bar dataKey="고정비" stackId="expense" fill="#f59e0b" maxBarSize={70} />
                <Bar dataKey="변동생활비" stackId="expense" fill="#e60050" maxBarSize={70} />
                <Bar dataKey="잉여현금" stackId="expense" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={70} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 하단 요약 풋터: 총합 및 월평균 동시 노출 */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">고정비 비중</span>
              <span className="font-bold text-amber-400">
                {cashflowSummary.total.income > 0
                  ? ((cashflowSummary.total.fixed / cashflowSummary.total.income) * 100).toFixed(1)
                  : 0}%
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  월평균 {formatMoney(cashflowSummary.avg.fixed)}
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">변동소비 비중</span>
              <span className="font-bold text-rose-400">
                {cashflowSummary.total.income > 0
                  ? ((cashflowSummary.total.variable / cashflowSummary.total.income) * 100).toFixed(1)
                  : 0}%
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  월평균 {formatMoney(cashflowSummary.avg.variable)}
                </span>
              )}
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">저축/잉여 비중</span>
              <span className="font-bold text-emerald-400">
                {cashflowSummary.savingsRate}%
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  월평균 {formatMoney(cashflowSummary.avg.surplus)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. 통합 지출 구조 도넛 차트 (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-pink-400" />
                통합 지출 구조 도넛
              </h3>
              <p className="text-xs text-slate-400">
                {cashflowSummary.periodLabel} 실질 소비 총 {formatMoney(cashflowSummary.total.expense)}
              </p>
            </div>
          </div>

          <div className="relative h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {donutChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const avgVal = Math.round(data.value / cashflowSummary.monthsCount);
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.name}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">총 지출액:</span>
                            <span className="font-bold text-white">{formatWon(data.value)}</span>
                          </div>
                          {cashflowSummary.isAggregate && (
                            <div className="flex justify-between gap-4">
                              <span className="text-slate-400">월평균:</span>
                              <span className="font-bold text-emerald-300">{formatMoney(avgVal)}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">지출 내 비중:</span>
                            <span className="font-bold text-brand-300">{data.ratio}%</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* 도넛 차트 중앙 텍스트: 총합 & 월평균 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {cashflowSummary.isAggregate ? '총 실질 지출' : '실질 총지출'}
              </span>
              <span className="text-lg font-extrabold text-white tracking-tight">
                {formatMoney(cashflowSummary.total.expense)}
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-[10px] text-brand-300 font-semibold mt-0.5">
                  월평균 {formatMoney(cashflowSummary.avg.expense)}
                </span>
              )}
            </div>
          </div>

          {/* 도넛 카테고리 범례 리스트 */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            {donutChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 truncate">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="font-bold text-white">{formatMoney(item.value)}</span>
                  <span className="text-slate-400 text-[11px] w-10 text-right">({item.ratio}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. 1년치(12개월) 월별 잉여현금 추이 꺾은선 차트                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              1년치 월별 현금흐름 & 잉여현금 추이
            </h3>
            <p className="text-xs text-slate-400">
              최근 12개월간의 수입, 총지출, 잉여현금(흑자/적자)의 장기 궤적 분석
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center gap-1.5 text-brand-300">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
              총수입
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              총지출
            </span>
            <span className="flex items-center gap-1.5 text-blue-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              잉여현금
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendChartData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
              <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={val => `${val}만`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                        <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                        {payload.map((entry, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-bold text-white">
                              {Number(entry.value).toLocaleString()}만 원
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="잉여현금" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="총수입" stroke="#008485" strokeWidth={2.5} dot={{ r: 3, fill: '#008485' }} />
              <Line type="monotone" dataKey="총지출" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* C. 자녀 교육비 특화 드릴다운 섹션                              */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-white">
                자녀 교육비 특화 통합 모니터링
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              은행 적요 기반 '청주페이 충전액'과 현대카드 '학원 결제 승인액'의 완전 통합 분석
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">연간 누적 교육비:</span>
            <span className="text-sm font-extrabold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-lg">
              {formatMoney(annualTotalEdu)}
            </span>
          </div>
        </div>

        {/* 교육비 3대 요약 위젯 카드: 총합 + 월평균 동시 노출 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-pink-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">{cashflowSummary.periodLabel} 통합 교육비</span>
              <span className="text-xl font-bold text-white">
                {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.education)}
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-xs text-pink-300 block mt-0.5 font-semibold">
                  월평균 {formatMoney(cashflowSummary.avg.education)}
                </span>
              )}
            </div>
            <span className="px-2 py-1 rounded-md bg-pink-500/20 text-pink-300 text-xs font-semibold">
              전체 지출의{' '}
              {cashflowSummary.total.expense > 0
                ? ((cashflowSummary.total.education / cashflowSummary.total.expense) * 100).toFixed(1)
                : 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">청주페이 충전액 (계좌출금)</span>
              <span className="text-xl font-bold text-emerald-400">
                {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.cheongjuPay)}
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-xs text-emerald-300 block mt-0.5 font-semibold">
                  월평균 {formatMoney(cashflowSummary.avg.cheongjuPay)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {cashflowSummary.total.education > 0
                ? ((cashflowSummary.total.cheongjuPay / cashflowSummary.total.education) * 100).toFixed(0)
                : 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">현대카드 학원비 (카드승인)</span>
              <span className="text-xl font-bold text-blue-400">
                {cashflowSummary.isAggregate ? '총 ' : ''}{formatMoney(cashflowSummary.total.cardAcademy)}
              </span>
              {cashflowSummary.isAggregate && (
                <span className="text-xs text-blue-300 block mt-0.5 font-semibold">
                  월평균 {formatMoney(cashflowSummary.avg.cardAcademy)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {cashflowSummary.total.education > 0
                ? ((cashflowSummary.total.cardAcademy / cashflowSummary.total.education) * 100).toFixed(0)
                : 0}%
            </span>
          </div>
        </div>

        {/* 12개월 청주페이 vs 카드 학원비 누적 바 차트 */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">월별 청주페이 vs 카드 학원비 추이 (최근 12개월)</span>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                청주페이
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                현대카드 학원비
              </span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eduTrendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v}만`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                          {payload.map((entry, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}:
                              </span>
                              <span className="font-bold text-white">
                                {Number(entry.value).toLocaleString()}만 원
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="청주페이" stackId="edu" fill="#10b981" maxBarSize={36} />
                <Bar dataKey="카드학원비" stackId="edu" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 상세 교육비 거래 내역 테이블 (드릴다운) */}
        <div className="pt-3 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-pink-400" />
              {cashflowSummary.periodLabel} 자녀 교육비 상세 내역 ({filteredEduDetails.length.toLocaleString()}건)
            </h4>
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setEduFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  eduFilter === 'all' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                전체 ({educationDetails.length})
              </button>
              <button
                onClick={() => setEduFilter('cheongju')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  eduFilter === 'cheongju' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                청주페이
              </button>
              <button
                onClick={() => setEduFilter('card')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                  eduFilter === 'card' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                현대카드
              </button>
            </div>
          </div>

          {filteredEduDetails.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
              해당 기간에 기록된 교육비 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50 max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">거래일자</th>
                    <th className="py-2.5 px-3 font-medium">채널/출처</th>
                    <th className="py-2.5 px-3 font-medium">학원명 / 적요</th>
                    <th className="py-2.5 px-3 font-medium text-right">결제금액</th>
                    <th className="py-2.5 px-3 font-medium">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEduDetails.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-300">{tx.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          tx.source === '청주페이'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}>
                          {tx.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">{tx.title}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-pink-400 font-mono">
                        {formatWon(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[200px]">{tx.memo || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* D. 고정비 분해 투명성 카드 (합계 + 월평균 동시 노출)             */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              {cashflowSummary.periodLabel} 통합 고정비 투명 내역 분해
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">총 고정비:</span>
            <span className="font-extrabold text-amber-400">{formatMoney(cashflowSummary.total.fixed)}</span>
            {cashflowSummary.isAggregate && (
              <span className="text-slate-400 font-medium">(월평균 {formatMoney(cashflowSummary.avg.fixed)})</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1 text-center">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">아파트관리비</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.apartmentMaintenance)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.apartmentMaintenance)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">통신비(LGU+)</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.telecom)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.telecom)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">도시가스(충청)</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.cityGas)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.cityGas)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">쿠쿠렌탈</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.rental)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.rental)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">지방세</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.localTax)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.localTax)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">보장성보험료</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.insurance)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.insurance)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">배우자생활비</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.spouseLiving)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.spouseLiving)}
              </span>
            )}
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">부모님정기용돈</span>
            <span className="text-xs sm:text-sm font-bold text-white block mt-0.5">
              {formatMoney(cashflowSummary.total.fixedDetails.parentsAllowance)}
            </span>
            {cashflowSummary.isAggregate && (
              <span className="text-[10px] text-amber-300/80 block mt-0.5">
                월 {formatMoney(cashflowSummary.avg.fixedDetails.parentsAllowance)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

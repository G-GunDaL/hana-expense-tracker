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
  LineChart,
  Line,
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
  ComposedChart
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
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  CheckCircle2,
  Receipt,
  FileSpreadsheet
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

  // 통합 현금흐름 데이터 연산
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

  // 선택된 연월 상태 (기본값: 가장 최신 월)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (unifiedData.length > 0) {
      return unifiedData[unifiedData.length - 1].yearMonth;
    }
    return '2026-09';
  });

  // 선택된 월 데이터 (또는 fallback)
  const currentMonthData: UnifiedMonthlyData = useMemo(() => {
    const found = unifiedData.find(d => d.yearMonth === selectedMonth);
    if (found) return found;
    if (unifiedData.length > 0) return unifiedData[unifiedData.length - 1];
    return {
      yearMonth: selectedMonth || '2026-09',
      totalIncome: 0,
      salaryIncome: 0,
      otherIncome: 0,
      totalFixed: 0,
      bankFixed: 0,
      cardFixed: 0,
      fixedDetails: {
        apartmentMaintenance: 0,
        telecom: 0,
        cityGas: 0,
        rental: 0,
        localTax: 0,
        insurance: 0,
        spouseLiving: 0,
        parentsAllowance: 0,
        otherFixed: 0
      },
      totalVariable: 0,
      cardPureVariable: 0,
      totalEduExpense: 0,
      eduCheongjuPay: 0,
      eduCardAcademy: 0,
      bankOtherExpense: 0,
      donutCategories: {
        fixed: 0,
        education: 0,
        onlineShopping: 0,
        foodDining: 0,
        transportVehicle: 0
      },
      netSurplus: 0,
      totalExpense: 0,
      savingsRate: 0,
      isDeficit: false,
      bankTxCount: 0,
      cardTxCount: 0,
      excludedCardTransferAmt: 0
    };
  }, [unifiedData, selectedMonth]);

  // 자녀 교육비 상세 거래 내역
  const educationDetails: EducationDetailTx[] = useMemo(() => {
    return getEducationDetailTransactions(selectedMonth, safeBank, safeCard);
  }, [selectedMonth, safeBank, safeCard]);

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

  // 금액 포맷터 헬퍼 (만 원 단위 및 원 단위)
  const formatManwon = (amount: number = 0) => {
    const val = Number(amount) || 0;
    const manwon = Math.round(val / 10000);
    return `${manwon.toLocaleString()}만 원`;
  };

  const formatWon = (amount: number = 0) => {
    return `${(Number(amount) || 0).toLocaleString()}원`;
  };

  // 이전/다음 월 네비게이션
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    }
  };

  // 1. 수입 배분 워터폴 / 누적 바 차트 데이터
  const waterfallChartData = useMemo(() => {
    const d = currentMonthData;
    const income = Number(d.totalIncome) || 0;
    const fixed = Number(d.totalFixed) || 0;
    const variable = Number(d.totalVariable) || 0;
    const surplus = Number(d.netSurplus) || 0;

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
  }, [currentMonthData]);

  // 2. 통합 지출 구조 도넛 차트 데이터
  const donutChartData = useMemo(() => {
    const cats = currentMonthData.donutCategories;
    const totalExp = Number(currentMonthData.totalExpense) || 1;

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
  }, [currentMonthData]);

  // 3. 1년치(최근 12개월) 월별 잉여현금 추이 꺾은선 차트 데이터
  const trendChartData = useMemo(() => {
    // 최근 12개월 슬라이스 (시간 오름차순)
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
      {/* 최상단: 대시보드 타이틀 & 월 선택 컨트롤러                     */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-glass">
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
                  방식 A 파이프라인
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                하나은행 입출금과 현대카드 승인 내역을 이중 계산 없이 실시간 1:1 통합
              </p>
            </div>
          </div>
        </div>

        {/* 월 선택 인터랙티브 컨트롤러 */}
        <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 p-1.5 rounded-xl self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-transparent text-white text-xs sm:text-sm font-bold px-2 py-1 focus:outline-none cursor-pointer"
          >
            {availableMonths.map(ym => (
              <option key={ym} value={ym} className="bg-slate-900 text-white">
                {ym.replace('-', '년 ')}월
              </option>
            ))}
          </select>

          <button
            onClick={handleNextMonth}
            disabled={availableMonths.indexOf(selectedMonth) <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 파이프라인 무결성 & 카드대금 이중 계산 방지 안내 배너           */}
      {/* ------------------------------------------------------------- */}
      <div className="rounded-xl bg-gradient-to-r from-brand-900/30 via-slate-900/80 to-purple-900/30 border border-brand-500/30 p-3.5 sm:p-4 text-xs flex flex-wrap items-center justify-between gap-3 shadow-glass">
        <div className="flex items-center space-x-2.5 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />
          <span>
            <strong className="text-white">이중 계산 자동 격리 완벽 적용:</strong> {selectedMonth}월 은행 계좌에서 출금된 현대카드 결제액{' '}
            <strong className="text-brand-300 font-mono">
              {formatManwon(currentMonthData.excludedCardTransferAmt)}
            </strong>
            을 지출 합계에서 자동 차감하고, 현대카드 실시간 승인 내역({currentMonthData.cardTxCount}건)으로 100% 대체 집계했습니다.
          </span>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            무결성 보증
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* A. 상단 4대 현금흐름 핵심 지표 카드 (선택된 월 기준)            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: 총수입 */}
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
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatManwon(currentMonthData.totalIncome)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                급여 {formatManwon(currentMonthData.salaryIncome)}
              </span>
              {currentMonthData.otherIncome > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-brand-500/15 border border-brand-500/30 text-brand-300">
                  기타 {formatManwon(currentMonthData.otherIncome)}
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {selectedMonth}월 실질 가계 유입액 (자산이동 제외)
            </p>
          </div>
        </div>

        {/* KPI 2: 고정비 */}
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
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatManwon(currentMonthData.totalFixed)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                계좌이체 {formatManwon(currentMonthData.bankFixed)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium">
                카드결제 {formatManwon(currentMonthData.cardFixed)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              관리비/통신/가스/렌탈/보험/정기이체 합산
            </p>
          </div>
        </div>

        {/* KPI 3: 변동생활비 */}
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
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatManwon(currentMonthData.totalVariable)}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium">
                카드소비 {formatManwon(currentMonthData.cardPureVariable)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-pink-500/15 border border-pink-500/30 text-pink-300 font-medium">
                자녀교육비 {formatManwon(currentMonthData.totalEduExpense)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              쇼핑/외식/마트 + 청주페이 및 카드학원비
            </p>
          </div>
        </div>

        {/* KPI 4: 잉여현금 & 저축 가능률 */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border p-5 shadow-glass transition-all duration-300 group ${
          currentMonthData.isDeficit
            ? 'border-red-500/40 bg-red-950/10 hover:border-red-400'
            : 'border-slate-800 hover:border-emerald-500/40'
        }`}>
          <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl transition-all ${
            currentMonthData.isDeficit ? 'bg-red-500/10' : 'bg-emerald-500/10 group-hover:bg-emerald-500/20'
          }`}></div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              4. 잉여현금 (저축/투자 여력)
            </span>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              currentMonthData.isDeficit
                ? 'bg-red-500/15 border-red-500/30 text-red-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}>
              {currentMonthData.isDeficit ? <TrendingDown className="w-5 h-5" /> : <PiggyBank className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              currentMonthData.isDeficit ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {currentMonthData.netSurplus >= 0 ? '+' : ''}{formatManwon(currentMonthData.netSurplus)}
            </div>
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs">
              <span className={`font-semibold px-2 py-0.5 rounded-md border ${
                currentMonthData.isDeficit
                  ? 'bg-red-500/20 border-red-500/30 text-red-300'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }`}>
                저축 가능률 {currentMonthData.savingsRate}% {currentMonthData.isDeficit ? '(적자 상태)' : '(흑자 기조)'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              수입({formatManwon(currentMonthData.totalIncome)}) - 총지출({formatManwon(currentMonthData.totalExpense)})
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
                {selectedMonth}월 수입-지출 1:1 배분 구조
              </h3>
              <p className="text-xs text-slate-400">
                총수입 대비 고정비, 변동생활비, 잉여현금(저축여력)의 100% 매칭 구조
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
                  tickFormatter={val => `${Math.round(val / 10000)}만`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
                          <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                          {payload.map((entry, idx) => {
                            if (Number(entry.value) <= 0) return null;
                            return (
                              <div key={idx} className="flex items-center justify-between gap-4">
                                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  {entry.name}:
                                </span>
                                <span className="font-bold text-white">
                                  {formatWon(Number(entry.value))}
                                </span>
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

          {/* 하단 요약 풋터 */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">고정비 비중</span>
              <span className="font-bold text-amber-400">
                {currentMonthData.totalIncome > 0
                  ? ((currentMonthData.totalFixed / currentMonthData.totalIncome) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">변동소비 비중</span>
              <span className="font-bold text-rose-400">
                {currentMonthData.totalIncome > 0
                  ? ((currentMonthData.totalVariable / currentMonthData.totalIncome) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-400 block text-[11px]">저축/잉여 비중</span>
              <span className="font-bold text-emerald-400">
                {currentMonthData.savingsRate}%
              </span>
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
                {selectedMonth}월 실질 소비 총 {formatManwon(currentMonthData.totalExpense)}
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
                      return (
                        <div className="bg-slate-950/95 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 backdrop-blur-md">
                          <p className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                            {data.name}
                          </p>
                          <div className="flex justify-between gap-4">
                            <span className="text-slate-400">지출액:</span>
                            <span className="font-bold text-white">{formatWon(data.value)}</span>
                          </div>
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

            {/* 도넛 차트 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">실질 총지출</span>
              <span className="text-lg font-extrabold text-white tracking-tight">
                {formatManwon(currentMonthData.totalExpense)}
              </span>
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
                  <span className="font-bold text-white">{formatManwon(item.value)}</span>
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
              {formatManwon(annualTotalEdu)}
            </span>
          </div>
        </div>

        {/* 교육비 3대 요약 위젯 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-pink-500/30 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">{selectedMonth}월 통합 교육비</span>
              <span className="text-xl font-bold text-white">{formatManwon(currentMonthData.totalEduExpense)}</span>
            </div>
            <span className="px-2 py-1 rounded-md bg-pink-500/20 text-pink-300 text-xs font-semibold">
              전체 지출의{' '}
              {currentMonthData.totalExpense > 0
                ? ((currentMonthData.totalEduExpense / currentMonthData.totalExpense) * 100).toFixed(1)
                : 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">청주페이 충전액 (계좌출금)</span>
              <span className="text-xl font-bold text-emerald-400">{formatManwon(currentMonthData.eduCheongjuPay)}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {currentMonthData.totalEduExpense > 0
                ? ((currentMonthData.eduCheongjuPay / currentMonthData.totalEduExpense) * 100).toFixed(0)
                : 0}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">현대카드 학원비 (카드승인)</span>
              <span className="text-xl font-bold text-blue-400">{formatManwon(currentMonthData.eduCardAcademy)}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {currentMonthData.totalEduExpense > 0
                ? ((currentMonthData.eduCardAcademy / currentMonthData.totalEduExpense) * 100).toFixed(0)
                : 0}%
            </span>
          </div>
        </div>

        {/* 12개월 청주페이 vs 카드 학원비 누적 바 차트 */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">월별 청주페이 vs 카드 학원비 추이 (12개월)</span>
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
              {selectedMonth}월 자녀 교육비 상세 승인/출금 내역 ({filteredEduDetails.length}건)
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
              해당 월에 기록된 교육비 내역이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
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
      {/* D. 고정비 분해 투명성 카드 (관리비/통신/가스/렌탈/보험 등)        */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-glass backdrop-blur-xl">
        <div className="flex items-center space-x-2 mb-3">
          <Building className="w-4 h-4 text-amber-400" />
          <h3 className="text-base font-bold text-white">
            {selectedMonth}월 통합 고정비 투명 내역 분해
          </h3>
          <span className="text-xs text-amber-400 font-bold ml-auto">
            합계: {formatManwon(currentMonthData.totalFixed)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1 text-center">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">아파트관리비</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.apartmentMaintenance)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">통신비(LGU+)</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.telecom)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">도시가스(충청)</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.cityGas)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">쿠쿠렌탈</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.rental)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">지방세</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.localTax)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">보장성보험료</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.insurance)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">배우자생활비</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.spouseLiving)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 block truncate">부모님정기용돈</span>
            <span className="text-xs sm:text-sm font-bold text-white">
              {formatManwon(currentMonthData.fixedDetails.parentsAllowance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

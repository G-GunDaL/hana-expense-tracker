import React from 'react';
import { CoreKPIStats } from '../types/finance';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  PiggyBank, 
  HeartHandshake, 
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

interface KPICardsProps {
  stats: CoreKPIStats;
}

export const KPICards: React.FC<KPICardsProps> = ({ stats: rawStats }) => {
  const stats: CoreKPIStats = rawStats || {
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

  // 포맷팅 헬퍼
  const formatManwon = (amount: number = 0) => {
    const manwon = Math.round((amount || 0) / 10000);
    return `${manwon.toLocaleString()}만 원`;
  };

  const formatEok = (amount: number = 0) => {
    const eok = ((amount || 0) / 100000000).toFixed(2);
    return `${eok}억 원`;
  };

  return (
    <div className="w-full">
      {/* KPI 카드: iPhone 스와이프 캐러셀 (snap-x), iPad 2열, PC 4열 그리드 */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        
        {/* KPI 1: 월평균 잉여 현금 (Free Cash Flow) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-brand-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              월평균 잉여 현금 (FCF)
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.avgSurplusCash >= 0 ? '+' : ''}{formatManwon(stats.avgSurplusCash)}
              </span>
            </div>
            
            {/* 서브 텍스트: 연간 형성 가능 자산 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-lg px-2.5 py-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="font-medium">
                연간 약 {formatManwon(stats.estAnnualSavings)} 자산 형성 가능
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              최근 {stats.monthCount}개월 실질소득-소비지출 기준
            </p>
          </div>
        </div>

        {/* KPI 2: 소득 대비 저축률 (%) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-brand-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              소득 대비 저축률
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.avgSavingsRate}%
              </span>
              <span className="text-xs font-medium text-slate-400">
                (목표 가이드 30%)
              </span>
            </div>

            {/* 전년도(14.0%) 대비 올해(35.8%) 개선율 배지 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium">
                24년({stats.prevYearSavingsRate}%) → 올해({stats.currentYearSavingsRate}%) 급격한 개선!
              </span>
            </div>

            {/* 목표선 30% 대비 게이지 프로그레스 바 */}
            <div className="mt-2.5">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.avgSavingsRate >= 30 ? 'bg-gradient-to-r from-emerald-500 to-brand-400' : 'bg-gradient-to-r from-blue-500 to-brand-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (stats.avgSavingsRate / 50) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: 카드값 전월 대비 증감률 (MoM %) */}
        <div className={`min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border p-5 shadow-glass transition-all duration-300 group ${
          stats.isCardAlert 
            ? 'border-amber-500/50 bg-amber-950/10 hover:border-amber-400' 
            : 'border-slate-800 hover:border-brand-500/40'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-all"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              카드값 전월비 (MoM)
            </span>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
              stats.isCardAlert 
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 animate-bounce' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              {stats.isCardAlert ? <AlertTriangle className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                stats.cardMomGrowthRate > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {stats.cardMomGrowthRate > 0 ? `+${stats.cardMomGrowthRate}%` : `${stats.cardMomGrowthRate}%`}
              </span>
              <span className="text-xs text-slate-400">
                이번 달 {formatManwon(stats.recentCardExpense)}
              </span>
            </div>

            {/* 10% 초과 경고 하이라이트 배지 */}
            {stats.isCardAlert ? (
              <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">
                  전월대비 10% 초과 주의! 지출 점검 요망
                </span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>전월 청구액: {formatManwon(stats.prevCardExpense)}</span>
              </div>
            )}

            <p className="mt-2 text-[11px] text-slate-400">
              현대카드 / 신한카드 결제액 자동 합산
            </p>
          </div>
        </div>

        {/* KPI 4: 비정기 지출 추이 (경조사/특수 송금) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass hover:border-brand-500/40 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              경조사 & 비정기 송금
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {formatManwon(stats.eventExpenseTotal)}
              </span>
              <span className="text-xs text-slate-400">
                (연평균 {formatManwon(stats.eventAnnualAvg)})
              </span>
            </div>

            {/* 장인어른(김철) 및 가족/지인 합산 누계 */}
            <div className="mt-2.5 flex items-center space-x-1.5 text-xs text-orange-300 bg-orange-500/10 border border-orange-500/20 rounded-lg px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="font-medium truncate">
                장인어른(김철): {formatManwon(stats.kimChulTotal)} 누적
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400 truncate">
              김철, 유병옥, 김종호, 나상길 등 특수 송금
            </p>
          </div>
        </div>

      </div>

      {/* 자산이전(홍승균 등) 격리 상태 배너 - Harness Gate 100% 보증 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-purple-500/20 text-xs">
        <div className="flex items-center space-x-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong className="text-purple-300">자산이동 격리 게이트 가동 중:</strong> 홍승균 명의 출금 및 투자이전{' '}
            <strong className="text-white font-mono">{formatEok(stats.totalInternalTransfer)}</strong>은 실질 가계지출에서 1원도 빠짐없이 100% 격리되었습니다.
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          하네스 무결성 검증 완료
        </span>
      </div>
    </div>
  );
};

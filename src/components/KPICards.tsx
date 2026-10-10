import React, { useState } from 'react';
import { CoreKPIStats } from '../types/finance';
import { usePrivacy } from '../context/PrivacyContext';
import { 
  TrendingUp, 
  CreditCard, 
  PiggyBank, 
  HeartHandshake, 
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface KPICardsProps {
  stats: CoreKPIStats;
}

export const KPICards: React.FC<KPICardsProps> = ({ stats: rawStats }) => {
  const { formatManwon, formatEok, isPrivate } = usePrivacy();
  const [isGateOpen, setIsGateOpen] = useState(false);

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

  return (
    <div className="w-full space-y-4">
      {/* KPI 카드: iPhone 스와이프 캐러셀 (snap-x), iPad 2열, PC 4열 그리드 */}
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        
        {/* KPI 1: 월평균 잉여 현금 (Free Cash Flow) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl card-glass-interactive p-5 shadow-glass group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl group-hover:bg-brand-500/20 transition-all duration-500"></div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>월평균 잉여 현금 (FCF)</span>
              <span title="실질소득에서 필수 소비지출을 차감한 순수 잉여 유동성">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
              </span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform duration-300">
              <PiggyBank className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.avgSurplusCash >= 0 && !isPrivate ? '+' : ''}{formatManwon(stats.avgSurplusCash)}
              </span>
            </div>
            
            {/* 서브 텍스트: 연간 형성 가능 자산 */}
            <div className="mt-3 flex items-center space-x-1.5 text-xs text-brand-300 bg-brand-500/10 border border-brand-500/25 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-400 shrink-0" />
              <span className="font-medium truncate">
                연간 약 {formatManwon(stats.estAnnualSavings)} 자산 형성 가능
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400">
              최근 {stats.monthCount}개월 실질소득-소비지출 기준
            </p>
          </div>
        </div>

        {/* KPI 2: 소득 대비 저축률 (%) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl card-glass-interactive p-5 shadow-glass group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>소득 대비 저축률</span>
              <span title="총소득 중 잉여 및 투자파이프라인으로 전환된 비율">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
              </span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform duration-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {stats.avgSavingsRate}%
              </span>
              <span className="text-xs font-medium text-slate-400">
                (목표 가이드 30%)
              </span>
            </div>

            {/* 전년도(14.0%) 대비 올해(35.8%) 개선율 배지 */}
            <div className="mt-3 flex items-center space-x-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium truncate">
                24년({stats.prevYearSavingsRate}%) → 올해({stats.currentYearSavingsRate}%) 개선 달성!
              </span>
            </div>

            {/* 목표선 30% 대비 게이지 프로그레스 바 */}
            <div className="mt-2.5">
              <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden flex p-[1px]">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    stats.avgSavingsRate >= 30 
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-brand-400' 
                      : 'bg-gradient-to-r from-blue-500 to-brand-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, (stats.avgSavingsRate / 50) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: 카드값 전월 대비 증감률 (MoM %) */}
        <div className={`min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl card-glass-interactive p-5 shadow-glass transition-all duration-300 group ${
          stats.isCardAlert ? 'border-amber-500/50 hover:border-amber-400 shadow-glow-accent' : ''
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-all duration-500"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>카드값 전월비 (MoM)</span>
              <span title="전월 대비 카드 이용 청구액 증감률">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
              </span>
            </span>
            <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
              stats.isCardAlert 
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 animate-pulse' 
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {stats.isCardAlert ? <AlertTriangle className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-3.5">
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
              <div className="mt-3 flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-xl px-2.5 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold truncate">
                  전월비 10% 초과 주의! 지출 점검 요망
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center space-x-1.5 text-xs text-slate-300 bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">전월 청구: {formatManwon(stats.prevCardExpense)}</span>
              </div>
            )}

            <p className="mt-2 text-[11px] text-slate-400">
              현대카드 / 신한카드 결제액 자동 합산
            </p>
          </div>
        </div>

        {/* KPI 4: 비정기 지출 추이 (경조사/특수 송금) */}
        <div className="min-w-[85vw] sm:min-w-0 snap-center shrink-0 sm:shrink relative overflow-hidden rounded-2xl card-glass-interactive p-5 shadow-glass group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all duration-500"></div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>경조사 & 비정기 송금</span>
              <span title="양가 부모님 및 친지 경조사비와 특수 목적 송금 누계">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
              </span>
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-105 transition-transform duration-300">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5">
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {formatManwon(stats.eventExpenseTotal)}
              </span>
              <span className="text-xs text-slate-400">
                (연평균 {formatManwon(stats.eventAnnualAvg)})
              </span>
            </div>

            {/* 장인어른(김철) 및 가족/지인 합산 누계 */}
            <div className="mt-3 flex items-center space-x-1.5 text-xs text-orange-300 bg-orange-500/10 border border-orange-500/25 rounded-xl px-2.5 py-1.5 backdrop-blur-sm">
              <Calendar className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span className="font-medium truncate">
                처가/친가 명절 및 경조금 분할 관리
              </span>
            </div>

            <p className="mt-2 text-[11px] text-slate-400 truncate">
              김철, 유병옥, 김종호, 나상길 등 특수 송금
            </p>
          </div>
        </div>

      </div>

      {/* 자산이전 격리 상태 인라인 아코디언 배너 (Harness Gate 100% 보증) */}
      <div className="rounded-2xl card-glass border-purple-500/25 overflow-hidden transition-all duration-300">
        <button
          onClick={() => setIsGateOpen(!isGateOpen)}
          className="w-full flex items-center justify-between p-3.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="font-bold text-purple-300">자산이동 격리 게이트: </span>
              <span className="text-slate-300 font-medium">홍승균 명의 출금 및 투자이전 </span>
              <strong className="text-white font-mono">{formatEok(stats.totalInternalTransfer)}</strong>
              <span className="text-slate-400">은 순수 가계지출에서 100% 격리되었습니다.</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
              하네스 무결성 보증
            </span>
            {isGateOpen ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4 text-purple-400" />}
          </div>
        </button>

        {isGateOpen && (
          <div className="px-4 pb-3.5 pt-1 border-t border-purple-500/15 text-xs text-slate-400 space-y-1.5 animate-fadeIn">
            <p className="leading-relaxed">
              💡 <strong>격리 원칙:</strong> 본인 명의 타행 계좌 이체, 미래에셋 증권 투자금, 주택청약 납입금 등은 부(Wealth)의 축적을 위한 '자산 이동'이므로 가계 생활비 지출 통계에서 원천 차단하여 저축률 왜곡을 방지합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default KPICards;

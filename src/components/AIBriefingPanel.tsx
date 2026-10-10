import React, { useState } from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { MonthlySummary, CoreKPIStats } from '../types/finance';
import { 
  Bot, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Lightbulb, 
  CreditCard, 
  GraduationCap,
  TrendingDown
} from 'lucide-react';

interface AIBriefingPanelProps {
  stats: CoreKPIStats;
  latestSummary?: MonthlySummary;
}

export const AIBriefingPanel: React.FC<AIBriefingPanelProps> = ({ stats: rawStats, latestSummary }) => {
  const { formatManwon, isPrivate } = usePrivacy();
  const [isOpen, setIsOpen] = useState(true);

  const stats = rawStats || {
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

  // 규칙 기반 분석 생성
  const isHighSavings = (stats.avgSavingsRate || 0) >= 30;
  const isCardWarning = Boolean(stats.isCardAlert);

  return (
    <div className="w-full card-glass rounded-2xl p-5 shadow-glass border-slate-800/90 relative overflow-hidden transition-all duration-300">
      {/* Background soft glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with toggle */}
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 p-[1px] shadow-md shadow-brand-500/20">
            <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
              <Bot className="w-4 h-4 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>AI 스마트 재무 브리핑 & 가드레일</span>
                <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                실시간 진단
              </span>
            </div>
            <p className="text-xs text-slate-400">
              가계 지출 규칙 준수 여부 및 결제 수단 최적화 모니터링
            </p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expandable Briefing Content */}
      {isOpen && (
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 space-y-3 animate-fadeIn">
          
          {/* Item 1: 저축률 & 현금흐름 진단 */}
          <div className="flex items-start space-x-3 bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isHighSavings ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>월평균 잉여 유동성 건전성 확보</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-semibold">
                  저축률 {stats.avgSavingsRate}%
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                월평균 <strong className="text-white">{formatManwon(stats.avgSurplusCash)}</strong>의 잉여 현금흐름이 발생하고 있으며, 부채 0원의 완벽한 재무 건전성 덕분에 전액 순자산 증식(연간 약 {formatManwon(stats.estAnnualSavings)}) 파이프라인으로 연결됩니다.
              </p>
            </div>
          </div>

          {/* Item 2: 카드 결제 수단 최적화 룰 가드레일 */}
          <div className="flex items-start space-x-3 bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              isCardWarning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>카드 리밸런싱 최적화 가이드</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-semibold">
                  연 108만 원 할인 목표
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                쿠팡 식자재 및 생활 필수 소비는 <strong className="text-brand-300">현대카드 X BOOST(5% 할인)</strong>, 주유 및 개인 용돈은 <strong className="text-brand-300">ZERO Edition3(0.5% 무제한 캐시백)</strong>을 전담하여 결제 혜택 누수를 원천 차단 중입니다.
              </p>
            </div>
          </div>

          {/* Item 3: 자녀 교육비 지역화폐 넛지 */}
          <div className="flex items-start space-x-3 bg-slate-900/60 border border-slate-800/90 rounded-xl p-3">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>자녀 학원비 청주페이(5% 인센티브) 방어선</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-pink-500/20 text-pink-300 rounded font-semibold">
                  연 36.6만 원 절감
                </span>
              </div>
              <p className="text-slate-300 mt-1 leading-relaxed">
                자녀 2인 학원비(월 약 61만 원)를 신용카드 대신 <strong>청주페이</strong>로 충전 결제하여 확정 5% 페이백 메커니즘을 안정적으로 수혜하고 있습니다.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

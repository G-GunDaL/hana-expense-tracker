import React from 'react';
import { usePrivacy } from '../context/PrivacyContext';
import { 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  Info,
  CalendarCheck
} from 'lucide-react';

interface TaxPipelineWidgetProps {
  currentYear?: string;
  totalSavedAmount?: number;
}

export const TaxPipelineWidget: React.FC<TaxPipelineWidgetProps> = ({
  currentYear = '2026',
  totalSavedAmount = 14500000
}) => {
  const { formatManwon, formatMoney } = usePrivacy();

  // 1. 연금계좌 세액공제 목표치
  const PENSION_TARGET = 9000000; // 900만 원 (IRP 450만 + 연금저축 450만)
  const PENSION_CURRENT = 9000000; // 100% 충족
  const PENSION_PERCENT = Math.min(100, Math.round((PENSION_CURRENT / PENSION_TARGET) * 100));
  const TAX_REFUND_EXPECTED = 1188000; // 900만 x 13.2% = 118.8만 원

  // 2. ISA 비과세 파이프라인
  const ISA_ANNUAL_TARGET = 20000000; // 연 2,000만 원
  const ISA_CURRENT = 7200000; // 월 60만 원 x 12개월
  const ISA_PERCENT = Math.min(100, Math.round((ISA_CURRENT / ISA_ANNUAL_TARGET) * 100));

  return (
    <div className="w-full card-glass rounded-2xl p-5 sm:p-6 shadow-glass relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                5단계 절세 & 자산배분 파이프라인
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                CFP 전략 가동
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              고소득 잉여 현금을 비과세·과세이연 복리 자산으로 전환하는 파이프라인
            </p>
          </div>
        </div>

        {/* Debt-Free Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/80 border border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">가계 건전성</div>
            <div className="text-xs font-extrabold text-white">부채 0원 (Debt-Free 100%)</div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Core Pipelines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-5">
        
        {/* Pipeline 1: IRP + 연금저축 세액공제 한도 */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                  1단계: 12월 성과급
                </span>
                <span className="text-xs font-semibold text-slate-200">연금계좌 세액공제</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {PENSION_PERCENT}% 완료
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatManwon(PENSION_CURRENT)}
              </span>
              <span className="text-xs text-slate-400">
                목표 한도 {formatManwon(PENSION_TARGET)}
              </span>
            </div>

            {/* Gauge */}
            <div className="mt-2.5 h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                style={{ width: `${PENSION_PERCENT}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              연말정산 환급 확정액
            </span>
            <span className="font-bold text-amber-300">
              +{formatMoney(TAX_REFUND_EXPECTED)} (13.2%)
            </span>
          </div>
        </div>

        {/* Pipeline 2: ISA 계좌 자산배분 */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/90 p-4 relative flex flex-col justify-between hover:border-slate-700 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                  3단계: 평달 적립식
                </span>
                <span className="text-xs font-semibold text-slate-200">ISA 자산배분 ETF</span>
              </div>
              <span className="text-xs font-bold text-blue-400">
                월 60만 원 적립 중
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatManwon(ISA_CURRENT)}
              </span>
              <span className="text-xs text-slate-400">
                연간 납입 한도 {formatManwon(ISA_ANNUAL_TARGET)}
              </span>
            </div>

            {/* Gauge */}
            <div className="mt-2.5 h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full transition-all duration-1000"
                style={{ width: `${ISA_PERCENT}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              비과세 혜택
            </span>
            <span className="font-bold text-blue-300">
              일반형 최대 200만~400만 비과세 (초과분 9.9% 분리과세)
            </span>
          </div>
        </div>

      </div>

      {/* 5-Step Process Summary Pills */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-medium text-slate-400">
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-center">
          <span className="text-purple-400 block font-bold">① 12월 성과급</span>
          IRP 900만 원 (100% 충족)
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-center">
          <span className="text-amber-400 block font-bold">② 5월 환급금</span>
          연금2 재투자 (복리엔진)
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-center">
          <span className="text-blue-400 block font-bold">③ 평달 유동성</span>
          ISA 월 60만 원 적립식
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-center">
          <span className="text-emerald-400 block font-bold">④ 대기 유동성</span>
          CMA / RP / 머니마켓
        </div>
        <div className="col-span-2 sm:col-span-1 bg-slate-900/50 border border-slate-800 rounded-lg p-2 text-center">
          <span className="text-pink-400 block font-bold">⑤ 3년 롤오버</span>
          연금전환 (추가공제 30만)
        </div>
      </div>
    </div>
  );
};

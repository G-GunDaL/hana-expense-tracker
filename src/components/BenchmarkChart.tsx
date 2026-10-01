import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  Legend 
} from 'recharts';
import { MonthlySummary } from '../types/finance';
import { 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  Info,
  Calendar
} from 'lucide-react';

interface BenchmarkChartProps {
  summaries: MonthlySummary[];
}

export const BenchmarkChart: React.FC<BenchmarkChartProps> = ({ summaries }) => {
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // 통계청 기준 상수 (원)
  const BENCHMARK_AVG = 4500000; // 450만 원 (전국 4인가구 평균)
  const BENCHMARK_TOP20 = 5800000; // 580만 원 (소득 상위 20% 5분위 평균)

  // 연도 필터링
  const availableYears = Array.from(
    new Set(summaries.map(s => s.yearMonth.substring(0, 4)))
  ).sort();

  const filteredSummaries = selectedYear === 'ALL'
    ? summaries
    : summaries.filter(s => s.yearMonth.startsWith(selectedYear));

  // 차트용 데이터 포맷
  const chartData = filteredSummaries.map(s => ({
    yearMonth: s.yearMonth,
    displayDate: s.yearMonth.slice(2), // '24-05' 등 모바일 가독성
    pureExpense: s.pureExpense,
    salaryIncome: s.salaryIncome,
    cardExpense: s.cardExpense,
    surplusCash: s.surplusCash,
    avgBenchmark: BENCHMARK_AVG,
    top20Benchmark: BENCHMARK_TOP20,
  }));

  // 최근 월 기준 벤치마크 대비 현황 산출
  const recentMonth = summaries[summaries.length - 1];
  const recentExpense = recentMonth ? recentMonth.pureExpense : 0;
  const recentDiffTop20 = recentExpense - BENCHMARK_TOP20;
  const recentDiffAvg = recentExpense - BENCHMARK_AVG;

  // 전체 기간 평균 지출
  const totalExpense = summaries.reduce((acc, cur) => acc + cur.pureExpense, 0);
  const avgExpense = summaries.length > 0 ? Math.round(totalExpense / summaries.length) : 0;
  const avgDiffTop20 = avgExpense - BENCHMARK_TOP20;

  // 원화 포맷터
  const formatManwon = (val: number) => {
    return `${Math.round(val / 10000).toLocaleString()}만원`;
  };

  // 커스텀 툴팁
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const expense = data.pureExpense;
      const diff5 = expense - BENCHMARK_TOP20;
      const diffAvg = expense - BENCHMARK_AVG;

      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl backdrop-blur-md text-xs max-w-[260px]">
          <p className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
            <span>{data.yearMonth} 가계 지출</span>
            <span className="text-[10px] text-slate-400 font-normal">통계청 비교</span>
          </p>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">우리 집 실질지출:</span>
              <span className="font-bold text-brand-300 text-sm">{formatManwon(expense)}</span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">현대/신한 카드값:</span>
              <span className="text-rose-400 font-semibold">{formatManwon(data.cardExpense)}</span>
            </div>

            <div className="pt-1.5 mt-1 border-t border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400">전국 4인가구 평균(450만):</span>
                <span className={`font-semibold ${diffAvg > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {diffAvg > 0 ? `+${formatManwon(diffAvg)}` : `${formatManwon(diffAvg)}`}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span className="text-orange-400">상위 20%(5분위, 580만):</span>
                <span className={`font-semibold ${diff5 > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {diff5 > 0 ? `+${formatManwon(diff5)}` : `${formatManwon(diff5)}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 shadow-glass">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
              <span>통계청 4인 가구 벤치마크 진단</span>
              <span className="text-xs font-normal text-slate-400 hidden md:inline">
                (실질 소비지출 vs 전국 평균 vs 상위 20%)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              우리 집 월별 지출 수준과 국가 통계 기준선과의 격차 정밀 모니터링
            </p>
          </div>
        </div>

        {/* 연도 필터 버튼 */}
        <div className="flex items-center space-x-1.5 self-start sm:self-auto bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setSelectedYear('ALL')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              selectedYear === 'ALL'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            전체
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                selectedYear === year
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {year}년
            </button>
          ))}
        </div>
      </div>

      {/* 상태 배지 영역 (요구사항 필수 배너) */}
      <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* 최근 월 상태 배지 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300">
                현재 지출 수준 ({recentMonth?.yearMonth}):{' '}
              </span>
              <span className="font-bold text-white">
                5분위(580만) 대비 {recentDiffTop20 >= 0 ? `+${formatManwon(recentDiffTop20)}` : formatManwon(recentDiffTop20)}
              </span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                카드 생활비({formatManwon(recentMonth?.cardExpense || 0)}) 집중 모니터링 필요
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/20 text-amber-300 uppercase shrink-0 ml-2">
            주의 요망
          </span>
        </div>

        {/* 3개년 누적 평균 진단 */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300">
          <div className="flex items-center space-x-2.5">
            <Info className="w-5 h-5 text-brand-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold text-brand-300">
                3개년 월평균 실질소비:{' '}
              </span>
              <span className="font-bold text-white">
                {formatManwon(avgExpense)}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">
                (상위 20% 대비 +{formatManwon(avgDiffTop20)})
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                본인 자산이동(월평균 수천만 원)은 완벽히 격리된 순수 가계 지출입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 범례 및 안내 가이드 */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mb-2 px-1">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-sm bg-brand-500 inline-block"></span>
            <span className="text-slate-300">우리 집 실질 소비지출</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-emerald-400 inline-block border-t-2 border-dashed border-emerald-400"></span>
            <span className="text-emerald-400 font-medium">통계청 4인가구 평균 (450만 원)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-orange-400 inline-block border-t-2 border-dashed border-orange-400"></span>
            <span className="text-orange-400 font-medium">소득 상위 20% 5분위 (580만 원)</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 mt-1 sm:mt-0">단위: 원</span>
      </div>

      {/* Recharts 반응형 컨테이너 */}
      <div className="w-full h-80 sm:h-96 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 15, left: -10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="displayDate" 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              interval={window.innerWidth < 640 ? 2 : 0}
              dy={10}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
              domain={[0, (dataMax: number) => Math.max(8000000, Math.ceil(dataMax * 1.1))]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 정적 기준선 1: 통계청 4인 가구 전국 평균 (450만 원) (초록색 점선) */}
            <ReferenceLine 
              y={BENCHMARK_AVG} 
              stroke="#10b981" 
              strokeDasharray="4 4" 
              strokeWidth={2}
              label={{
                value: '통계청 평균 (450만)',
                position: 'insideTopLeft',
                fill: '#10b981',
                fontSize: 10,
                fontWeight: 600,
                dy: -10
              }}
            />

            {/* 정적 기준선 2: 통계청 소득 상위 20%(5분위) 4인 가구 평균 (580만 원) (주황색 점선) */}
            <ReferenceLine 
              y={BENCHMARK_TOP20} 
              stroke="#f97316" 
              strokeDasharray="4 4" 
              strokeWidth={2}
              label={{
                value: '상위 20% (580만)',
                position: 'insideTopLeft',
                fill: '#f97316',
                fontSize: 10,
                fontWeight: 600,
                dy: -10
              }}
            />

            {/* 실질 소비지출 막대 (Bar) */}
            <Bar 
              dataKey="pureExpense" 
              name="우리 집 실질 소비지출" 
              fill="#008485" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />

            {/* 카드 결제액 추이 라인 (추가 보조선) */}
            <Line 
              type="monotone" 
              dataKey="cardExpense" 
              name="카드 결제액" 
              stroke="#e60050" 
              strokeWidth={2} 
              dot={{ r: 2, fill: '#e60050' }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

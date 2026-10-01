import React, { useState } from 'react';
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
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { MonthlySummary, ParsedTx } from '../types/finance';
import { CATEGORY_COLORS } from '../utils/classifier';
import { 
  PieChart as PieIcon, 
  TrendingUp, 
  CreditCard, 
  HeartHandshake, 
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExpenseAnalyticsProps {
  summaries: MonthlySummary[];
  transactions: ParsedTx[];
}

export const ExpenseAnalytics: React.FC<ExpenseAnalyticsProps> = ({ summaries, transactions }) => {
  const [activeSubTab, setActiveSubTab] = useState<'category' | 'trend' | 'card' | 'familyEvent'>('category');

  const formatManwon = (v: number) => `${Math.round(v / 10000).toLocaleString()}만원`;

  // 1. 카테고리별 전체 누적 지출 집계
  const categoryTotals: Record<string, number> = {};
  transactions.forEach(tx => {
    if (tx.outAmt > 0 && !tx.isInternalTransfer) {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.outAmt;
    }
  });

  const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalExpense > 0 ? Number(((value / totalExpense) * 100).toFixed(1)) : 0
    }))
    .sort((a, b) => b.value - a.value);

  // 2. 비정기 경조사비 상세 필터
  const eventTxs = transactions.filter(tx => 
    tx.outAmt > 0 && 
    (tx.category === '비정기지출:경조사비' || ['김철', '유병옥', '김종호', '나상길'].some(k => tx.desc.includes(k)))
  ).sort((a, b) => b.txDatetime.localeCompare(a.txDatetime));

  // 연도별 경조사비 집계
  const eventByYear: Record<string, { total: number; kimChul: number; others: number }> = {};
  eventTxs.forEach(tx => {
    const y = tx.txDatetime.substring(0, 4);
    if (!eventByYear[y]) eventByYear[y] = { total: 0, kimChul: 0, others: 0 };
    eventByYear[y].total += tx.outAmt;
    if (tx.desc.includes('김철')) {
      eventByYear[y].kimChul += tx.outAmt;
    } else {
      eventByYear[y].others += tx.outAmt;
    }
  });

  const eventYearData = Object.entries(eventByYear)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, d]) => ({
      year,
      '장인어른(김철)': d.kimChul,
      '기타 경조사': d.others,
      '합계': d.total
    }));

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 shadow-glass">
      
      {/* 탭 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <Layers className="w-5 h-5 text-brand-400" />
            <span>다차원 가계 지출 분석</span>
          </h2>
          <p className="text-xs text-slate-400">카테고리별 비중, 카드값 추이, 경조사비 상세 흐름</p>
        </div>

        {/* 서브 탭 전환 버튼 */}
        <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('category')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              activeSubTab === 'category' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>카테고리 비중</span>
          </button>
          <button
            onClick={() => setActiveSubTab('trend')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              activeSubTab === 'trend' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>월별 수지 트렌드</span>
          </button>
          <button
            onClick={() => setActiveSubTab('card')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              activeSubTab === 'card' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>카드값 변동 (MoM)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('familyEvent')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center space-x-1.5 whitespace-nowrap transition-all ${
              activeSubTab === 'familyEvent' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>경조사비 상세</span>
          </button>
        </div>
      </div>

      {/* 탭 1: 카테고리별 비중 */}
      {activeSubTab === 'category' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* 도넛 차트 */}
          <div className="lg:col-span-6 h-72 sm:h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CATEGORY_COLORS[entry.name] || '#64748b'} 
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [formatManwon(val), '총 지출']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 카테고리별 리스트 */}
          <div className="lg:col-span-6 space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <p className="text-xs font-semibold text-slate-400 mb-2">실질 가계 소비지출 항목별 랭킹</p>
            {pieData.map((item, idx) => (
              <div 
                key={item.name}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-800/80 transition-all text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#64748b' }}
                  />
                  <div>
                    <span className="font-semibold text-white">{item.name}</span>
                    <span className="text-[11px] text-slate-400 ml-2">({item.percentage}%)</span>
                  </div>
                </div>
                <span className="font-bold text-slate-200">{formatManwon(item.value)}</span>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 탭 2: 월별 수지 트렌드 */}
      {activeSubTab === 'trend' && (
        <div className="mt-6">
          <div className="h-80 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaries} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="yearMonth" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => `${(v/10000).toLocaleString()}만`}
                />
                <Tooltip 
                  formatter={(v: number, name: string) => [formatManwon(v), name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="salaryIncome" name="근로소득(급여)" fill="#008485" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pureExpense" name="실질 가계지출" fill="#e60050" radius={[4, 4, 0, 0]} />
                <Bar dataKey="surplusCash" name="잉여 현금 (저축가능액)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 탭 3: 카드값 변동 (MoM) */}
      {activeSubTab === 'card' && (
        <div className="mt-6 space-y-4">
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaries} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="yearMonth" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => `${(v/10000).toLocaleString()}만`}
                />
                <Tooltip 
                  formatter={(v: number, name: string) => [
                    name === '전월비 증감률(%)' ? `${v}%` : formatManwon(v),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="cardExpense" 
                  name="현대/신한 카드 결제액" 
                  stroke="#e60050" 
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#e60050' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {summaries.slice(-4).map((s) => (
              <div 
                key={s.yearMonth} 
                className={`p-3 rounded-xl border ${
                  s.cardMomGrowth >= 10 
                    ? 'border-amber-500/40 bg-amber-950/20' 
                    : 'border-slate-800 bg-slate-800/40'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">{s.yearMonth}</span>
                  <span className={`text-[11px] font-bold ${
                    s.cardMomGrowth > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {s.cardMomGrowth > 0 ? `+${s.cardMomGrowth}%` : `${s.cardMomGrowth}%`}
                  </span>
                </div>
                <div className="mt-1 text-sm font-bold text-white">
                  {formatManwon(s.cardExpense)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 4: 경조사비 상세 추이 */}
      {activeSubTab === 'familyEvent' && (
        <div className="mt-6 space-y-6">
          
          {/* 연도별 경조사비 차트 */}
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventYearData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => `${(v/10000).toLocaleString()}만`}
                />
                <Tooltip 
                  formatter={(v: number, name: string) => [formatManwon(v), name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="장인어른(김철)" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="기타 경조사" fill="#64748b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 건별 상세 내역 리스트 */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 mb-3 flex items-center justify-between">
              <span>경조사비 및 비정기 송금 상세 내역 ({eventTxs.length}건)</span>
              <span className="text-[11px] text-orange-400">장인어른(김철), 유병옥, 김종호, 나상길 등</span>
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {eventTxs.map(tx => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs hover:border-slate-700"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-400 font-mono text-[11px]">{tx.txDatetime.slice(0, 10)}</span>
                    <span className="font-semibold text-white">{tx.desc}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      {tx.txType}
                    </span>
                  </div>
                  <span className="font-bold text-orange-400">{formatManwon(tx.outAmt)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

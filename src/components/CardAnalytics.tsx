import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { CardStatementTx } from '../types/finance';
import { CARD_CATEGORIES, CARD_CATEGORY_COLORS } from '../utils/cardClassifier';
import { 
  CreditCard, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Search, 
  Upload, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  ShoppingBag,
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCircle2,
  Building
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface CardAnalyticsProps {
  cardTransactions: CardStatementTx[];
  onOpenCardUpload: () => void;
  onLoadSampleData?: () => void;
}

export const CardAnalytics: React.FC<CardAnalyticsProps> = ({
  cardTransactions,
  onOpenCardUpload,
  onLoadSampleData
}) => {
  // 1. rawTransactions가 undefined나 null이어도 절대 크래시가 나지 않도록 기본값 보장
  const safeTransactions = Array.isArray(cardTransactions) ? cardTransactions : [];

  // 사용 가능한 청구월 목록 (내림차순 정렬)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    safeTransactions.forEach(t => {
      if (!t) return;
      const m = (t as any).statement_month || t.statementMonth || ((t as any).tx_date ? String((t as any).tx_date).slice(0, 7) : (t.txDate ? String(t.txDate).slice(0, 7) : null));
      if (m) set.add(m);
    });
    return Array.from(set).sort().reverse();
  }, [safeTransactions]);

  // 상단 제어 상태 (단일 진실 공급원의 1차 필터링 조건)
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths.length > 0 ? availableMonths[0] : 'ALL'
  );
  const [excludeFixed, setExcludeFixed] = useState<boolean>(false);

  // 테이블 전용 세부 필터 상태 (2차 필터)
  const [selectedOwner, setSelectedOwner] = useState<'ALL' | '본인' | '가족'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // =========================================================================
  // [A] 핵심 필터 파이프라인 (Unified Filter Pipeline)
  // 청구월 선택(selectedMonth) 및 고정비 제외 토글(excludeFixed)이 모두 반영된 배열
  // =========================================================================
  const filteredTransactions = useMemo(() => {
    if (safeTransactions.length === 0) return [];
    return safeTransactions.filter((tx) => {
      if (!tx) return false;
      // 1-1. 청구월 필터 (전체 누적 'ALL'이 아닐 경우 해당 월만 필터)
      const month = (tx as any).statement_month || tx.statementMonth || ((tx as any).tx_date ? String((tx as any).tx_date).slice(0, 7) : (tx.txDate ? String(tx.txDate).slice(0, 7) : '기타'));
      if (selectedMonth !== 'ALL' && month !== selectedMonth) {
        return false;
      }

      // 1-2. 고정비 제외 토글 필터 (아파트관리비, 통신비, 도시가스/공과금, 렌탈, 정기학원비 등)
      if (excludeFixed) {
        const cat = tx.category || '';
        const mer = tx.merchant || '';
        const isFixed = 
          ['주거/공과금', '통신비', '생활렌탈/구독', '교육/학원'].includes(cat) ||
          /관리비|LG유플러스|LGU\+|충청에너지|도시가스|쿠쿠|지방세|대법원|우체국|렌탈|학원|태권도/.test(mer) ||
          Boolean(tx.isFixed);

        if (isFixed) {
          return false;
        }
      }

      return true;
    });
  }, [safeTransactions, selectedMonth, excludeFixed]);

  // =========================================================================
  // [B] 모든 차트 및 요약 파생 데이터를 filteredTransactions 기반으로 구축
  // =========================================================================

  // 1. 소비 주체 비율 (본인 vs 가족) 파이 데이터
  // [고정비 제외] 토글 반영된 filteredTransactions 기반 실시간 집계
  const ownerShareData = useMemo(() => {
    let personalSum = 0;
    let familySum = 0;

    filteredTransactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      const isFamily = (tx as any).card_owner === '가족' || tx.cardOwner === '가족' || ((tx as any).card_name && (tx as any).card_name.includes('가족')) || (tx.cardName && tx.cardName.includes('가족'));
      if (isFamily) {
        familySum += amt;
      } else {
        personalSum += amt;
      }
    });

    const total = personalSum + familySum;
    if (total === 0) return [];

    return [
      { 
        name: '본인', 
        value: personalSum, 
        percentage: Math.round((personalSum / total) * 100),
        color: '#0d9488' // 틸/에메랄드
      },
      { 
        name: '가족', 
        value: familySum, 
        percentage: Math.round((familySum / total) * 100),
        color: '#e11d48' // 로즈/마젠타
      }
    ];
  }, [filteredTransactions]);

  // 2. 8대 정밀 카테고리 비중 (도넛/파이 차트 데이터)
  const categoryShareData = useMemo(() => {
    const catMap: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      const cat = tx.category || '기타소비';
      catMap[cat] = (catMap[cat] || 0) + (Number(tx.amount) || 0);
    });

    const total = Object.values(catMap).reduce((a, b) => a + b, 0);

    return Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 3. Top 5 최다 소비처 바 차트 데이터
  const topMerchantsData = useMemo(() => {
    const merchantMap: Record<string, number> = {};

    filteredTransactions.forEach(tx => {
      const name = tx.normalizedMerchant || tx.merchant;
      merchantMap[name] = (merchantMap[name] || 0) + (Number(tx.amount) || 0);
    });

    return Object.entries(merchantMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // 4. 1년치 월별 카드 지출 트렌드 (월별 추이 꺾은선 차트)
  // 월별 트렌드 차트 전용: selectedMonth와 무관하게 12개월 전체 타임라인 유지, isExcludeFixed 토글은 100% 반영
  const monthlyTrendData = useMemo(() => {
    if (safeTransactions.length === 0) return [];
    // 1. 고정비 제외 토글 여부에 따른 기본 대상 트랜잭션 추출
    const validTxs = safeTransactions.filter(tx => {
      if (!tx) return false;
      if (!excludeFixed) return true;
      const cat = tx.category || '';
      const mer = tx.merchant || '';
      const isFixed = 
        ['주거/공과금', '통신비', '생활렌탈/구독', '교육/학원'].includes(cat) ||
        /관리비|LG유플러스|LGU\+|충청에너지|도시가스|쿠쿠|지방세|대법원|우체국|렌탈|학원|태권도/.test(mer) ||
        Boolean(tx.isFixed);
      return !isFixed;
    });

    // 2. 월별 Map 생성 및 실제 건별 합산
    const monthMap: Record<string, { total: number; personal: number; family: number }> = {};

    validTxs.forEach(tx => {
      const month = (tx as any).statement_month || tx.statementMonth || ((tx as any).tx_date ? String((tx as any).tx_date).slice(0, 7) : (tx.txDate ? String(tx.txDate).slice(0, 7) : '기타'));
      if (!monthMap[month]) {
        monthMap[month] = { total: 0, personal: 0, family: 0 };
      }
      const amt = Number(tx.amount) || 0;
      monthMap[month].total += amt;
      
      // 본인 vs 가족 분기
      const isFamily = (tx as any).card_owner === '가족' || tx.cardOwner === '가족' || ((tx as any).card_name && (tx as any).card_name.includes('가족')) || (tx.cardName && tx.cardName.includes('가족'));
      if (isFamily) {
        monthMap[month].family += amt;
      } else {
        monthMap[month].personal += amt;
      }
    });

    // 3. 월 오름차순 정렬 및 Recharts 포맷 변환 (절대 12로 나누거나 평균 복사하지 않음!)
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({
        month,
        '총 카드지출': Math.round(val.total),
        '본인 카드': Math.round(val.personal),
        '가족 카드': Math.round(val.family),
      }));
  }, [safeTransactions, excludeFixed]);

  // 5. 상단 4대 핵심 KPI 카드 요약 통계 (filteredTransactions 기반)
  const summaryStats = useMemo(() => {
    const totalAmount = filteredTransactions.reduce((acc, cur) => acc + (Number(cur?.amount) || 0), 0);
    
    const selfItem = ownerShareData.find(d => d.name === '본인');
    const familyItem = ownerShareData.find(d => d.name === '가족');
    const selfAmount = selfItem ? selfItem.value : 0;
    const familyAmount = familyItem ? familyItem.value : 0;
    const selfRatio = selfItem ? selfItem.percentage : 0;
    const familyRatio = familyItem ? familyItem.percentage : 0;

    let fixedAmount = 0;
    let variableAmount = 0;

    filteredTransactions.forEach(t => {
      if (!t) return;
      const amt = Number(t.amount) || 0;
      const cat = t.category || '';
      const mer = t.merchant || '';
      const isFixed = 
        ['주거/공과금', '통신비', '생활렌탈/구독', '교육/학원'].includes(cat) ||
        /관리비|LG유플러스|LGU\+|충청에너지|도시가스|쿠쿠|지방세|대법원|우체국|렌탈|학원|태권도/.test(mer) ||
        Boolean(t.isFixed);

      if (isFixed) fixedAmount += amt;
      else variableAmount += amt;
    });

    // 선택된 월의 전체 원본(고정비 포함) 총액 - 고정비 얼마인지 참고용
    const rawMonthTxs = selectedMonth === 'ALL'
      ? safeTransactions
      : safeTransactions.filter(t => {
          if (!t) return false;
          const m = (t as any).statement_month || t.statementMonth || ((t as any).tx_date ? String((t as any).tx_date).slice(0, 7) : (t.txDate ? String(t.txDate).slice(0, 7) : '기타'));
          return m === selectedMonth;
        });
    const rawTotalAmount = rawMonthTxs.reduce((acc, cur) => acc + (Number(cur?.amount) || 0), 0);
    const rawFixedAmount = rawMonthTxs
      .filter(t => {
        if (!t) return false;
        const cat = t.category || '';
        const mer = t.merchant || '';
        return (
          ['주거/공과금', '통신비', '생활렌탈/구독', '교육/학원'].includes(cat) ||
          /관리비|LG유플러스|LGU\+|충청에너지|도시가스|쿠쿠|지방세|대법원|우체국|렌탈|학원|태권도/.test(mer) ||
          Boolean(t.isFixed)
        );
      })
      .reduce((acc, cur) => acc + (Number(cur?.amount) || 0), 0);

    return {
      totalAmount,
      rawTotalAmount,
      rawFixedAmount,
      selfAmount,
      familyAmount,
      selfRatio,
      familyRatio,
      fixedAmount,
      variableAmount,
      txCount: filteredTransactions.length,
      topMerchant: topMerchantsData.length > 0 ? topMerchantsData[0] : null
    };
  }, [filteredTransactions, ownerShareData, safeTransactions, selectedMonth, topMerchantsData]);

  // =========================================================================
  // [C] 상세 거래 테이블용 2차 필터링 파이프라인
  // =========================================================================
  const tableTransactions = useMemo(() => {
    return filteredTransactions.filter(tx => {
      if (!tx) return false;
      // 소유자 필터
      if (selectedOwner !== 'ALL' && tx.cardOwner !== selectedOwner) {
        return false;
      }

      // 카테고리 필터
      if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) {
        return false;
      }

      // 검색어 필터 (가맹점, 카드명, 정규화가맹점)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchMerch = (tx.merchant || '').toLowerCase().includes(term);
        const matchCard = (tx.cardName || '').toLowerCase().includes(term);
        const matchNorm = (tx.normalizedMerchant || '').toLowerCase().includes(term);
        if (!matchMerch && !matchCard && !matchNorm) return false;
      }

      return true;
    }).sort((a, b) => (b.txDate || '').localeCompare(a.txDate || ''));
  }, [filteredTransactions, selectedOwner, selectedCategory, searchTerm]);

  // 페이지네이션
  const totalPages = Math.ceil(tableTransactions.length / itemsPerPage) || 1;
  const paginatedTxs = tableTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatManwon = (v: number) => `${Math.round(v / 10000).toLocaleString()}만원`;

  // 엑셀 다운로드
  const exportToExcel = () => {
    const exportData = tableTransactions.map(t => ({
      '청구월': t.statementMonth,
      '이용일자': t.txDate,
      '카드명': t.cardName,
      '소유자': t.cardOwner,
      '가맹점명': t.merchant,
      '카테고리': t.category,
      '이용금액(원)': t.amount,
      '고정성여부': t.isFixed ? '고정지출' : '변동지출'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '현대카드_이용내역');
    XLSX.writeFile(wb, `현대카드_${selectedMonth}_소비상세_${excludeFixed ? '고정비제외' : '전체'}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. 상단 컨트롤 바: 청구월 선택기 & 고정비 제외 토글 & 파일 업로더 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-glass">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                <span>현대카드 가맹점 상세 소비 분석</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 font-normal">
                  단일 필터 파이프라인 동기화
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                월 선택 및 고정비 제외 토글 변경 시 모든 차트/테이블/지표가 실시간 연동됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* 청구월 셀렉터 */}
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 min-h-[44px]">
            <span className="text-xs text-slate-400 font-medium">청구월:</span>
            <select
              value={selectedMonth}
              onChange={(e) => { 
                setSelectedMonth(e.target.value); 
                setCurrentPage(1); 
              }}
              className="bg-transparent text-xs sm:text-sm text-white font-bold focus:outline-none cursor-pointer"
              aria-label="청구월 선택"
            >
              <option value="ALL" className="bg-slate-900">전체 누적 ({availableMonths.length}개월)</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym} className="bg-slate-900">
                  {ym} 명세서
                </option>
              ))}
            </select>
          </div>

          {/* 고정비 제외 토글 스위치 */}
          <button
            onClick={() => {
              setExcludeFixed(!excludeFixed);
              setCurrentPage(1);
            }}
            className={`min-h-[44px] flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
              excludeFixed
                ? 'border-purple-500/70 bg-purple-950/40 text-purple-200 shadow-md shadow-purple-500/20 ring-1 ring-purple-500/40'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
            title="관리비, 통신비, 도시가스, 학원비 등 고정비를 제외하고 순수 생활 변동소비만 분석합니다."
          >
            <ShieldCheck className={`w-4 h-4 ${excludeFixed ? 'text-purple-400' : 'text-slate-400'}`} />
            <span>고정비 제외 순수 변동지출 보기</span>
            {excludeFixed && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            )}
          </button>

          {/* 일괄 업로드 버튼 */}
          <button
            onClick={onOpenCardUpload}
            className="min-h-[44px] flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-brand-500/25 active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>명세서 일괄 업로드</span>
          </button>
        </div>
      </div>

      {/* 데이터가 없을 때의 Empty State UI (iPhone/iPad/초기 접속 대응) */}
      {safeTransactions.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/50 border border-brand-500/30 p-6 sm:p-8 text-center space-y-4 shadow-glass animate-fadeIn">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">현대카드 명세서 데이터가 없습니다</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
              명세서 파일(.xls)을 업로드하거나 기본 데이터를 불러오세요.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenCardUpload}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand-500/20 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>명세서 파일(.xls) 업로드</span>
            </button>
            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all border border-slate-700 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-brand-400" />
                <span>기본 샘플 데이터 불러오기</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 필터 활성화 상태 알림 배너 */}
      {excludeFixed && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              <strong>[고정비 제외 필터 가동 중]:</strong> 아파트관리비, LG유플러스(통신비), 도시가스, 학원비 등 고정지출 
              (<strong className="text-white">{formatManwon(summaryStats.rawFixedAmount)}</strong>)이 모든 차트와 목록에서 완전히 제외되어 
              <strong className="text-brand-300"> 순수 생활 변동소비({formatManwon(summaryStats.totalAmount)})</strong>만 분석 중입니다.
            </span>
          </div>
          <button
            onClick={() => setExcludeFixed(false)}
            className="text-[11px] underline text-purple-300 hover:text-white shrink-0 ml-2"
          >
            필터 해제
          </button>
        </div>
      )}

      {/* 2. 카드 소비 4대 핵심 KPI 카드 (filteredTransactions 동기화) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: 총 청구금액 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {selectedMonth === 'ALL' ? '총 카드 청구액' : `${selectedMonth} 카드 청구액`}
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {formatManwon(summaryStats.totalAmount)}
            </span>
            <p className="mt-1 text-[11px] text-slate-400">
              {excludeFixed ? (
                <span className="text-purple-300 font-medium">고정비 제외 순수 변동소비 ({summaryStats.txCount}건)</span>
              ) : (
                <span>총 {summaryStats.txCount.toLocaleString()}건 결제 (고정비 포함)</span>
              )}
            </p>
          </div>
        </div>

        {/* KPI 2: 본인 vs 가족 카드 비중 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              소비 주체 (본인 vs 가족)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between items-baseline text-xs">
              <span className="text-[#0d9488] font-semibold">본인: {formatManwon(summaryStats.selfAmount)} ({summaryStats.selfRatio}%)</span>
              <span className="text-[#e11d48] font-semibold">가족: {formatManwon(summaryStats.familyAmount)} ({summaryStats.familyRatio}%)</span>
            </div>
            {/* 프로그레스 바 */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#0d9488] h-full transition-all duration-500" 
                style={{ width: `${summaryStats.selfRatio}%` }}
                title={`본인: ${summaryStats.selfRatio}%`}
              />
              <div 
                className="bg-[#e11d48] h-full transition-all duration-500" 
                style={{ width: `${summaryStats.familyRatio}%` }}
                title={`가족: ${summaryStats.familyRatio}%`}
              />
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              가족(쇼핑/장보기) vs 본인(주유/식대/교통)
            </p>
          </div>
        </div>

        {/* KPI 3: 고정비 vs 변동비 상태 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {excludeFixed ? '고정비 분리 완료' : '고정비 vs 순수 변동비'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl sm:text-2xl font-bold text-white">
                {excludeFixed ? formatManwon(summaryStats.totalAmount) : formatManwon(summaryStats.variableAmount)}
              </span>
              <span className="text-xs text-slate-400">(변동)</span>
            </div>
            <div className="mt-1 flex items-center space-x-1.5 text-xs text-purple-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {excludeFixed ? '고정비 전체 격리됨' : `고정지출: ${formatManwon(summaryStats.rawFixedAmount)}`}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-400 truncate">
              아파트관리비, 통신비, 도시가스, 학원비
            </p>
          </div>
        </div>

        {/* KPI 4: 1위 최다 소비처 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 p-5 shadow-glass">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              최대 지출 가맹점 Top 1
            </span>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            {summaryStats.topMerchant ? (
              <>
                <span className="text-xl sm:text-2xl font-bold text-white truncate block">
                  {summaryStats.topMerchant.name}
                </span>
                <p className="mt-1 text-xs text-orange-400 font-semibold">
                  {formatManwon(summaryStats.topMerchant.amount)}
                </p>
              </>
            ) : (
              <span className="text-sm text-slate-500">지출 내역 없음</span>
            )}
            <p className="mt-1 text-[10px] text-slate-400 truncate">
              현재 필터링 조건 기준 1위 지출처
            </p>
          </div>
        </div>

      </div>

      {/* 3. 시각화 차트 그리드: 모든 차트가 filteredTransactions로부터 파생된 데이터를 직접 수신 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 차트 1: [본인 vs 가족] 소비 주체 파이 차트 (ownerShareData 바인딩) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-glass">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-brand-400" />
                <span>소비 주체 비중 (본인 vs 가족)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedMonth === 'ALL' ? '전체 누적' : selectedMonth} {excludeFixed && '· 고정비 제외'}
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              총 {formatManwon(summaryStats.totalAmount)}
            </span>
          </div>
          
          <div className="h-56 flex items-center justify-center">
            {ownerShareData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ownerShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ownerShareData.map((entry, index) => (
                      <Cell key={`owner-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number, name: string) => {
                      const item = ownerShareData.find(d => d.name === name);
                      const pct = item ? ` (${item.percentage}%)` : '';
                      return [`${formatManwon(val)}${pct}`, name];
                    }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">데이터가 없습니다.</div>
            )}
          </div>

          <div className="flex justify-around text-xs mt-2 border-t border-slate-800 pt-3">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#0d9488] inline-block"></span>
              <span className="text-slate-300">
                본인 ({ownerShareData.find(d => d.name === '본인')?.percentage ?? summaryStats.selfRatio}%)
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e11d48] inline-block"></span>
              <span className="text-slate-300">
                가족 ({ownerShareData.find(d => d.name === '가족')?.percentage ?? summaryStats.familyRatio}%)
              </span>
            </div>
          </div>
        </div>

        {/* 차트 2: 8대 카테고리별 지출 비중 도넛 차트 (categoryShareData 바인딩) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-glass">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-brand-400" />
                <span>8대 정밀 카테고리 비중</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedMonth === 'ALL' ? '전체 누적' : selectedMonth} {excludeFixed && '· 고정비 제외'}
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {categoryShareData.length}개 분류
            </span>
          </div>

          <div className="h-56 flex items-center justify-center">
            {categoryShareData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryShareData.map((entry, index) => (
                      <Cell 
                        key={`cat-cell-${index}`} 
                        fill={CARD_CATEGORY_COLORS[entry.name] || '#94a3b8'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => [formatManwon(val), '총 이용액']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-500">데이터가 없습니다.</div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] justify-center text-slate-400 mt-2 border-t border-slate-800 pt-3 max-h-12 overflow-y-auto">
            {categoryShareData.slice(0, 4).map(c => (
              <span key={c.name} className="flex items-center space-x-1">
                <span 
                  className="w-2 h-2 rounded-full inline-block" 
                  style={{ backgroundColor: CARD_CATEGORY_COLORS[c.name] || '#94a3b8' }} 
                />
                <span>{c.name} ({c.percentage}%)</span>
              </span>
            ))}
          </div>
        </div>

        {/* 차트 3: Top 5 최다 소비처 가로 막대 차트 (topMerchantsData 바인딩) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-glass">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-orange-400" />
                <span>Top 5 최다 소비처</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {selectedMonth === 'ALL' ? '전체 누적' : selectedMonth} {excludeFixed && '· 고정비 제외'}
              </p>
            </div>
          </div>

          <div className="h-56">
            {topMerchantsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={topMerchantsData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis 
                    type="number" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickFormatter={v => `${Math.round(v/10000)}만`} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    width={90}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val: number) => [formatManwon(val), '총 결제액']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#008485" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                표시할 가맹점 내역이 없습니다.
              </div>
            )}
          </div>

          <div className="text-center text-[11px] text-slate-400 mt-2 border-t border-slate-800 pt-3">
            {excludeFixed ? '고정비를 제외한 순수 소비처 순위' : '전체 최다 지출처 랭킹'}
          </div>
        </div>

      </div>

      {/* 4. 1년치 월별 카드 지출 트렌드 (월별 추이 꺾은선 차트: excludeFixed 100% 반영) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-glass">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-brand-400" />
              <span>1년치 월별 카드 지출 트렌드</span>
            </h3>
            <p className="text-xs text-slate-400">
              12개월 전체 추이 {excludeFixed && '· (아파트관리비/통신비/학원비 등 고정비 제외됨)'}
            </p>
          </div>
          {excludeFixed && (
            <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] border border-purple-500/30 self-start sm:self-auto font-medium">
              고정비 제외 트렌드 반영 중
            </span>
          )}
        </div>

        {monthlyTrendData.length > 0 ? (
          <div style={{ width: '100%', height: 300, minHeight: 300 }}>
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={v => `${Math.round(v/10000)}만`} 
                />
                <Tooltip 
                  formatter={(v: number, name: string) => [formatManwon(v), name]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="총 카드지출" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ r: 3, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="본인 카드" 
                  stroke="#0d9488" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                />
                <Line 
                  type="monotone" 
                  dataKey="가족 카드" 
                  stroke="#e11d48" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">
            업로드된 카드 명세서 데이터가 없습니다. 파일을 업로드해 주세요.
          </div>
        )}
      </div>

      {/* 5. 상세 거래 테이블 & 필터 (tableTransactions 바인딩) */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 shadow-glass">
        
        {/* 필터 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-brand-400" />
              <span>가맹점 거래내역 상세 목록</span>
            </h3>
            <p className="text-xs text-slate-400">
              총 {tableTransactions.length.toLocaleString()}건 표시 
              {selectedMonth !== 'ALL' && ` (${selectedMonth})`}
              {excludeFixed && ' (고정비 제외 상태)'}
            </p>
          </div>

          <button
            onClick={exportToExcel}
            className="min-h-[44px] flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>카드내역 엑셀 다운로드</span>
          </button>
        </div>

        {/* 필터 컨트롤 바 */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          
          {/* 가맹점 검색 */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="가맹점명, 카드명 검색 (예: 쿠팡, 스타벅스)..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-all min-h-[44px]"
            />
          </div>

          {/* 소유자 필터 (본인 vs 가족) */}
          <div className="lg:col-span-3 flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 min-h-[44px]">
            {(['ALL', '본인', '가족'] as const).map(owner => (
              <button
                key={owner}
                onClick={() => { setSelectedOwner(owner); setCurrentPage(1); }}
                className={`flex-1 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all ${
                  selectedOwner === owner ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {owner === 'ALL' ? '전체' : owner}
              </button>
            ))}
          </div>

          {/* 카테고리 필터 드롭다운 */}
          <div className="lg:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full py-2.5 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 transition-all min-h-[44px] cursor-pointer"
            >
              <option value="ALL">전체 카테고리</option>
              {CARD_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        {/* 거래 목록: 반응형 테이블 */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">이용일자</th>
                <th className="py-3 px-3">소유자</th>
                <th className="py-3 px-3">카드명</th>
                <th className="py-3 px-4">가맹점명</th>
                <th className="py-3 px-3">카테고리</th>
                <th className="py-3 px-4 text-right">이용금액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginatedTxs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                    {tx.txDate}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-sans">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      tx.cardOwner === '가족' 
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                        : 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                    }`}>
                      {tx.cardOwner}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-sans text-slate-300">
                    {tx.cardName}
                  </td>
                  <td className="py-3 px-4 font-sans font-medium text-white max-w-xs truncate">
                    <div className="flex items-center space-x-1.5">
                      <span>{tx.merchant}</span>
                      {tx.isFixed && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          고정비
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-sans">
                    <span 
                      className="px-2 py-0.5 rounded-md text-[11px] font-semibold border inline-flex items-center"
                      style={{
                        backgroundColor: `${CARD_CATEGORY_COLORS[tx.category] || '#94a3b8'}20`,
                        borderColor: `${CARD_CATEGORY_COLORS[tx.category] || '#94a3b8'}50`,
                        color: CARD_CATEGORY_COLORS[tx.category] || '#e2e8f0'
                      }}
                    >
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-400 whitespace-nowrap">
                    {Number(tx.amount).toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {paginatedTxs.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              일치하는 카드 거래 내역이 없습니다.
            </div>
          )}
        </div>

        {/* 페이징 컨트롤 */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            페이지 <span className="font-bold text-white">{currentPage}</span> / {totalPages} (총 {tableTransactions.length.toLocaleString()}건)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 active:scale-95 transition-all"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <span className="min-h-[44px] flex items-center justify-center px-4 py-2 bg-slate-800/80 rounded-xl text-white font-medium border border-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 active:scale-95 transition-all"
              aria-label="다음 페이지"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

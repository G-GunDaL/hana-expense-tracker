import React, { useState, useEffect, useMemo } from 'react';
import { ParsedTx, MonthlySummary, CoreKPIStats, CardStatementTx } from './types/finance';
import { calculateMonthlySummaries, calculateCoreKPIStats } from './utils/excelParser';
import { useFinancialData } from './hooks/useFinancialData';
import { 
  uploadTransactionsToSupabase,
  uploadMonthlySummariesToSupabase,
  clearLocalStorage
} from './services/supabaseClient';
import {
  getCachedCardStatements,
  saveCachedCardStatements,
  fetchCardStatementsFromSupabase,
  uploadCardStatementsToSupabase,
  clearCardStatementCache
} from './services/cardStatementService';
import initialTransactionsData from './data/initialTransactions.json';

// Components
import { Navbar } from './components/Navbar';
import { KPICards } from './components/KPICards';
import { BenchmarkChart } from './components/BenchmarkChart';
import { ExpenseAnalytics } from './components/ExpenseAnalytics';
import { TransactionTable } from './components/TransactionTable';
import { CardAnalytics } from './components/CardAnalytics';
import { FileUploader } from './components/FileUploader';
import { CardFileUploader } from './components/CardFileUploader';
import { SettingsModal } from './components/SettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RefreshCw, Cloud, CheckCircle2, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  // useFinancialData: 모바일/원격 접속 시 Supabase 우선 조회 & 로컬 캐시 하이드레이션
  const { 
    data: transactions, 
    setData: setTransactions, 
    isLoading, 
    isSupabaseConnected, 
    setIsSupabaseConnected, 
    refetch, 
    error: dataError 
  } = useFinancialData();

  // 현대카드 명세서 데이터 상태 (안전한 지연 로딩)
  const [cardTransactions, setCardTransactions] = useState<CardStatementTx[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return getCachedCardStatements() || [];
    } catch (e) {
      console.error('Failed to parse card statement cache:', e);
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isCardUploadOpen, setIsCardUploadOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Supabase에서 카드 명세서 데이터 로드 (초기 1회)
  useEffect(() => {
    if (isSupabaseConnected) {
      fetchCardStatementsFromSupabase().then(remoteCards => {
        if (remoteCards && remoteCards.length > 0) {
          setCardTransactions(remoteCards);
          saveCachedCardStatements(remoteCards);
        }
      });
    }
  }, [isSupabaseConnected]);

  // 월별 스냅샷 및 4대 KPI 실시간 계산 (트랜잭션 변경 시 멱등 자동 갱신)
  const monthlySummaries: MonthlySummary[] = useMemo(() => {
    return calculateMonthlySummaries(transactions);
  }, [transactions]);

  const coreKPIStats: CoreKPIStats = useMemo(() => {
    return calculateCoreKPIStats(transactions, monthlySummaries);
  }, [transactions, monthlySummaries]);

  // 하나은행 거래내역서 업로드 성공 핸들러
  const handleUploadSuccess = async (newTxs: ParsedTx[], result: any) => {
    if (newTxs.length === 0) return;

    const merged = [...transactions, ...newTxs];
    setTransactions(merged);

    // Supabase 연동되어 있다면 자동 백그라운드 동기화
    if (isSupabaseConnected) {
      setIsSyncing(true);
      setSyncStatus('Supabase 클라우드 데이터베이스에 동기화 중...');
      const uploadRes = await uploadTransactionsToSupabase(newTxs);
      const newSummaries = calculateMonthlySummaries(merged);
      await uploadMonthlySummariesToSupabase(newSummaries);
      setIsSyncing(false);
      setSyncStatus(uploadRes.message);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  // 현대카드 명세서 다중 파일 업로드 성공 핸들러
  const handleCardUploadSuccess = async (mergedTxs: CardStatementTx[], report: any) => {
    setCardTransactions(mergedTxs);
    saveCachedCardStatements(mergedTxs);

    // Supabase 연동되어 있다면 자동 백그라운드 동기화
    if (isSupabaseConnected) {
      setIsSyncing(true);
      setSyncStatus('현대카드 명세서를 Supabase에 동기화 중...');
      const uploadRes = await uploadCardStatementsToSupabase(mergedTxs);
      setIsSyncing(false);
      setSyncStatus(uploadRes.message);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  // 개별 트랜잭션 수기 수정 (카테고리, 메모 등)
  const handleUpdateTransaction = (updatedTx: ParsedTx) => {
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
  };

  // 원본 데이터 복원
  const handleRestoreInitialData = () => {
    const initialList = initialTransactionsData as ParsedTx[];
    setTransactions(initialList);
    clearCardStatementCache();
    setCardTransactions(getCachedCardStatements());
    setIsSettingsOpen(false);
  };

  // 데이터 초기화
  const handleClearAllData = () => {
    if (window.confirm('정말로 모든 로컬 가계부 및 카드 거래 내역을 초기화하시겠습니까?')) {
      setTransactions([]);
      setCardTransactions([]);
      clearLocalStorage();
      clearCardStatementCache();
      setIsSettingsOpen(false);
    }
  };

  // 수동 새로고침 / 동기화
  const handleRefreshData = async () => {
    setIsSyncing(true);
    await refetch();
    if (isSupabaseConnected) {
      const remoteCards = await fetchCardStatementsFromSupabase();
      if (remoteCards && remoteCards.length > 0) {
        setCardTransactions(remoteCards);
        saveCachedCardStatements(remoteCards);
      }
    }
    setIsSyncing(false);
    setSyncStatus('최신 데이터가 동기화되었습니다.');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 md:pb-10 overflow-x-hidden">
      
      {/* 글로벌 상단 헤더 */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFileUpload={() => setIsUploadOpen(true)}
        onResetData={handleRestoreInitialData}
        onRefreshData={handleRefreshData}
        isRefreshing={isSyncing || isLoading}
        totalTxCount={transactions.length}
      />

      {/* 동기화 및 알림 바 */}
      {syncStatus && (
        <div className="bg-brand-500/20 border-b border-brand-500/30 text-brand-300 text-xs py-2 px-4 text-center font-medium animate-fadeIn">
          {syncStatus}
        </div>
      )}

      {/* 로딩 인디케이터 (초기 하이드레이션) */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 animate-spin">
            <RefreshCw className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            가계 재무 데이터를 불러오는 중...
          </p>
          <p className="text-xs text-slate-500">
            {isSupabaseConnected ? 'Supabase 클라우드에서 최신 데이터를 가져옵니다.' : '로컬 캐시에서 데이터를 복원합니다.'}
          </p>
        </div>
      ) : (
        /* 메인 컨텐츠 컨테이너 */
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-6">
          
          {/* 상단 4대 핵심 모니터링 KPI 카드 */}
          {activeTab === 'dashboard' && (
            <>
              <KPICards stats={coreKPIStats} />
              
              {/* 메인 대시보드 뷰: 벤치마크 차트 & 지출 요약 그리드 */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-12">
                  <BenchmarkChart summaries={monthlySummaries} />
                </div>
                <div className="lg:col-span-12">
                  <ExpenseAnalytics summaries={monthlySummaries} transactions={transactions} />
                </div>
              </div>
            </>
          )}

          {/* 4인가구 벤치마크 전용 탭 */}
          {activeTab === 'benchmark' && (
            <div className="space-y-6">
              <KPICards stats={coreKPIStats} />
              <BenchmarkChart summaries={monthlySummaries} />
            </div>
          )}

          {/* 현대카드 소비 상세 신규 탭 */}
          {activeTab === 'cardAnalytics' && (
            <div className="space-y-6">
              <CardAnalytics 
                cardTransactions={cardTransactions || []}
                onOpenCardUpload={() => setIsCardUploadOpen(true)}
                onLoadSampleData={handleRestoreInitialData}
              />
            </div>
          )}

          {/* 다차원 지출 트렌드 전용 탭 */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <KPICards stats={coreKPIStats} />
              <ExpenseAnalytics summaries={monthlySummaries} transactions={transactions} />
            </div>
          )}

          {/* 하나은행 거래내역 전용 탭 */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <TransactionTable 
                transactions={transactions} 
                onUpdateTransaction={handleUpdateTransaction} 
              />
            </div>
          )}

        </main>
      )}

      {/* 하나은행 엑셀 파일 업로드 모달 */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl">
            <FileUploader
              existingTransactions={transactions}
              onUploadSuccess={handleUploadSuccess}
              onClose={() => setIsUploadOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 현대카드 명세서 다중 파일 업로드 모달 */}
      {isCardUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl">
            <CardFileUploader
              existingTransactions={cardTransactions}
              onUploadSuccess={handleCardUploadSuccess}
              onClose={() => setIsCardUploadOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 설정 및 Supabase DDL 모달 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onRestoreInitialData={handleRestoreInitialData}
        onClearAllData={handleClearAllData}
        onSupabaseConfigured={() => {
          setIsSupabaseConnected(true);
          refetch();
        }}
      />

      {/* 모바일(iPhone) 하단 고정 네비게이션 바 */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFileUpload={() => setIsUploadOpen(true)}
      />

    </div>
  );
};

export default App;

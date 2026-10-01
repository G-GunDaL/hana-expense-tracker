import { useEffect, useState, useCallback } from 'react';
import { ParsedTx } from '../types/finance';
import { 
  fetchTransactionsFromSupabase, 
  getCachedTransactions, 
  saveCachedTransactions,
  getSupabaseClient
} from '../services/supabaseClient';
import initialTransactionsData from '../data/initialTransactions.json';

export function useFinancialData() {
  const [data, setData] = useState<ParsedTx[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Supabase 클라이언트 확인 및 원격 데이터 조회 시도
      const client = getSupabaseClient();
      if (client) {
        setIsSupabaseConnected(true);
        const remoteTxs = await fetchTransactionsFromSupabase();
        if (remoteTxs && remoteTxs.length > 0) {
          setData(remoteTxs);
          saveCachedTransactions(remoteTxs);
          setIsLoading(false);
          return;
        }
      } else {
        setIsSupabaseConnected(false);
      }

      // 2. 오프라인 / 로컬 스토리지 캐시 확인 (hana_transactions_cache / hana_tx_cache)
      const cached = getCachedTransactions();
      if (cached && cached.length > 0) {
        setData(cached);
        setIsLoading(false);
        return;
      }

      // 3. 초기 상태 시 3개년 969건 실데이터로 안전한 하이드레이션
      const initialList = initialTransactionsData as ParsedTx[];
      setData(initialList);
      saveCachedTransactions(initialList);
    } catch (err: any) {
      console.error('데이터 로드 실패:', err);
      setError(err?.message || '데이터를 불러오는 중 오류가 발생했습니다.');
      
      // 에러 발생 시에도 기본 실데이터로 fallback
      const cached = getCachedTransactions() || (initialTransactionsData as ParsedTx[]);
      setData(cached);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 로컬 상태 및 캐시 동기 업데이트
  const updateData = (newData: ParsedTx[]) => {
    setData(newData);
    saveCachedTransactions(newData);
  };

  return { 
    data, 
    setData: updateData, 
    isLoading, 
    isSupabaseConnected, 
    setIsSupabaseConnected,
    refetch: loadData,
    error 
  };
}

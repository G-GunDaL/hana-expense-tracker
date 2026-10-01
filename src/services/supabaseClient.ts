import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ParsedTx, MonthlySummary, SupabaseConfig, TransactionCategory } from '../types/finance';

const STORAGE_KEY_CONFIG = 'hana_supabase_config';
const STORAGE_KEY_TXS = 'hana_transactions_cache';
const STORAGE_KEY_TX_FALLBACK = 'hana_tx_cache';
const STORAGE_KEY_SUMMARIES = 'hana_summaries_cache';

// 환경변수 (Vite & Vercel NEXT_PUBLIC_ 모두 지원)
function getEnv(key: string): string {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = typeof process !== 'undefined' ? (process as any).env || {} : {};
  return metaEnv[key] || procEnv[key] || '';
}

// 기본 환경변수 또는 로컬스토리지 저장값 로드
export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = 
    getEnv('NEXT_PUBLIC_SUPABASE_URL') || 
    getEnv('VITE_SUPABASE_URL');
  const envKey = 
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
    getEnv('VITE_SUPABASE_ANON_KEY');

  const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        isConnected: false
      };
    } catch {
      // ignore
    }
  }

  return {
    url: envUrl,
    anonKey: envKey,
    isConnected: false
  };
}

export function saveSupabaseConfig(config: { url: string; anonKey: string }): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(config?: { url: string; anonKey: string }): SupabaseClient | null {
  const c = config || getSavedSupabaseConfig();
  if (!c.url || !c.anonKey) return null;

  if (supabaseInstance && (supabaseInstance as any).supabaseUrl === c.url) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(c.url, c.anonKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to create Supabase client', err);
    return null;
  }
}

/**
 * Supabase 연결 상태 테스트
 */
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, anonKey);
    const { error } = await client.from('transactions').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Supabase 연결 성공! 단, transactions 테이블이 아직 생성되지 않았습니다. SQL DDL을 실행해주세요.'
        };
      }
      return { success: false, message: `오류: ${error.message}` };
    }
    return { success: true, message: 'Supabase 데이터베이스에 정상적으로 연결되었습니다.' };
  } catch (err: any) {
    return { success: false, message: `연결 실패: ${err.message || err}` };
  }
}

/**
 * Supabase에서 거래 데이터 조회 (원격 클라우드 우선 Fetch)
 */
export async function fetchTransactionsFromSupabase(): Promise<ParsedTx[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .order('tx_datetime', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // DB 스키마 -> ParsedTx 매핑
    return data.map((row: any) => ({
      id: row.id || `tx_${Math.random().toString(36).substr(2, 9)}`,
      txDatetime: row.tx_datetime ? row.tx_datetime.replace('T', ' ').substring(0, 16) : '',
      txType: row.tx_type || '',
      desc: row.description || '',
      outAmt: Number(row.out_amt) || 0,
      inAmt: Number(row.in_amt) || 0,
      balance: Number(row.balance) || 0,
      branch: row.branch || '',
      category: row.category as TransactionCategory,
      isInternalTransfer: Boolean(row.is_internal_transfer),
      memo: row.memo || '',
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Error fetching transactions from Supabase:', err);
    return null;
  }
}

/**
 * 트랜잭션을 Supabase로 Upsert (중복 건은 무시)
 */
export async function uploadTransactionsToSupabase(
  transactions: ParsedTx[]
): Promise<{ success: boolean; uploaded: number; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, uploaded: 0, message: 'Supabase가 설정되지 않았습니다. (로컬 캐시 모드로 작동 중)' };
  }

  try {
    const payload = transactions.map(t => ({
      tx_datetime: t.txDatetime,
      tx_type: t.txType,
      description: t.desc,
      out_amt: t.outAmt,
      in_amt: t.inAmt,
      balance: t.balance,
      branch: t.branch,
      category: t.category,
      is_internal_transfer: t.isInternalTransfer,
      memo: t.memo || ''
    }));

    // 배치 분할 업로드 (한 번에 200건씩)
    const BATCH_SIZE = 200;
    let uploadedCount = 0;

    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const { data, error } = await client
        .from('transactions')
        .upsert(batch, { onConflict: 'tx_datetime,description,out_amt,in_amt,balance', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.warn('Batch upsert warning:', error.message);
      } else {
        uploadedCount += data ? data.length : batch.length;
      }
    }

    return {
      success: true,
      uploaded: uploadedCount,
      message: `${uploadedCount}건의 거래가 Supabase에 안전하게 동기화되었습니다.`
    };
  } catch (err: any) {
    console.error('Supabase upload error:', err);
    return { success: false, uploaded: 0, message: `업로드 실패: ${err.message || err}` };
  }
}

/**
 * 월별 스냅샷 Supabase 업로드
 */
export async function uploadMonthlySummariesToSupabase(
  summaries: MonthlySummary[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const payload = summaries.map(s => ({
      year_month: s.yearMonth,
      salary_income: s.salaryIncome,
      other_income: s.otherIncome,
      pure_expense: s.pureExpense,
      card_expense: s.cardExpense,
      fixed_expense: s.fixedExpense,
      irregular_expense: s.irregularExpense,
      child_edu_expense: s.childEduExpense,
      surplus_cash: s.surplusCash,
      savings_rate: s.savingsRate,
      card_mom_growth: s.cardMomGrowth,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client
      .from('monthly_financial_summaries')
      .upsert(payload, { onConflict: 'year_month' });

    if (error) {
      console.warn('Monthly summaries upsert warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to sync monthly summaries to Supabase', err);
    return false;
  }
}

/**
 * 로컬 캐시 관리 (hana_transactions_cache & hana_tx_cache 양방향 지원)
 */
export function getCachedTransactions(): ParsedTx[] | null {
  const data = localStorage.getItem(STORAGE_KEY_TXS) || localStorage.getItem(STORAGE_KEY_TX_FALLBACK);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveCachedTransactions(txs: ParsedTx[]): void {
  try {
    const serialized = JSON.stringify(txs);
    localStorage.setItem(STORAGE_KEY_TXS, serialized);
    localStorage.setItem(STORAGE_KEY_TX_FALLBACK, serialized);
  } catch (e) {
    console.warn('LocalStorage limit reached for transaction cache', e);
  }
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY_TXS);
  localStorage.removeItem(STORAGE_KEY_TX_FALLBACK);
  localStorage.removeItem(STORAGE_KEY_SUMMARIES);
}

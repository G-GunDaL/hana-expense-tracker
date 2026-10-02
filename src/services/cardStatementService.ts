import { CardStatementTx } from '../types/finance';
import { getSupabaseClient } from './supabaseClient';
import { initialDemoCardTransactions } from '../data/initialCardStatements';

const STORAGE_KEY_CARD_TXS = 'hana_card_statements_cache';

/**
 * 로컬 캐시에서 카드 거래내역 가져오기
 */
export function getCachedCardStatements(): CardStatementTx[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CARD_TXS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 기존 더미 데모 데이터인 경우 새로운 계절별 동적 데이터로 자동 갱신
        if (parsed[0]?.id?.startsWith('demo_card_')) {
          const fresh = initialDemoCardTransactions;
          saveCachedCardStatements(fresh);
          return fresh;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load card statement cache:', err);
  }
  return initialDemoCardTransactions;
}

/**
 * 로컬 캐시에 카드 거래내역 저장
 */
export function saveCachedCardStatements(txs: CardStatementTx[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CARD_TXS, JSON.stringify(txs));
  } catch (err) {
    console.warn('LocalStorage limit reached for card statements', err);
  }
}

/**
 * Supabase에서 카드 명세서 거래내역 가져오기
 */
export async function fetchCardStatementsFromSupabase(): Promise<CardStatementTx[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('card_statements')
      .select('*')
      .order('tx_date', { ascending: false });

    if (error) {
      console.warn('Supabase card_statements fetch error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data.map((row: any) => ({
      id: row.id,
      statementMonth: row.statement_month,
      txDate: row.tx_date,
      cardName: row.card_name || '현대카드',
      cardOwner: row.card_owner || '본인',
      merchant: row.merchant,
      normalizedMerchant: row.normalized_merchant || row.merchant,
      category: row.category,
      amount: Number(row.amount) || 0,
      isFixed: /주거|공과금|통신|렌탈|학원/.test(row.category),
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch card statements from Supabase:', err);
    return null;
  }
}

/**
 * Supabase로 카드 명세서 업로드 (배치 처리)
 */
export async function uploadCardStatementsToSupabase(
  txs: CardStatementTx[]
): Promise<{ success: boolean; uploaded: number; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, uploaded: 0, message: 'Supabase가 설정되지 않았습니다. (로컬 캐시 모드)' };
  }

  try {
    const payload = txs.map(t => ({
      statement_month: t.statementMonth,
      tx_date: t.txDate,
      card_name: t.cardName,
      card_owner: t.cardOwner,
      merchant: t.merchant,
      normalized_merchant: t.normalizedMerchant,
      category: t.category,
      amount: t.amount
    }));

    const BATCH_SIZE = 300;
    let uploaded = 0;

    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const { data, error } = await client
        .from('card_statements')
        .upsert(batch, { onConflict: 'tx_date,card_name,merchant,amount', ignoreDuplicates: true })
        .select('id');

      if (error) {
        console.warn('Supabase card upload error:', error.message);
      } else {
        uploaded += data ? data.length : batch.length;
      }
    }

    return {
      success: true,
      uploaded,
      message: `${uploaded}건의 카드 거래가 Supabase에 동기화되었습니다.`
    };
  } catch (err: any) {
    return { success: false, uploaded: 0, message: `업로드 실패: ${err.message || err}` };
  }
}

export function clearCardStatementCache(): void {
  localStorage.removeItem(STORAGE_KEY_CARD_TXS);
}

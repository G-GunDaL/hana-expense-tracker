import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Copy, 
  Check, 
  Smartphone, 
  RefreshCw, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import { 
  getSavedSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection 
} from '../services/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreInitialData: () => void;
  onClearAllData: () => void;
  onSupabaseConfigured: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onRestoreInitialData,
  onClearAllData,
  onSupabaseConfigured
}) => {
  if (!isOpen) return null;

  const currentConfig = getSavedSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const supabaseDdlSql = `-- 1. 개별 거래 내역 테이블
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    tx_type VARCHAR(50) NOT NULL,            -- 구분 (급여이체, 타행송금, 보험료 등)
    description TEXT NOT NULL,                -- 적요 (원문)
    out_amt NUMERIC(15, 2) DEFAULT 0,         -- 출금액
    in_amt NUMERIC(15, 2) DEFAULT 0,          -- 입금액
    balance NUMERIC(15, 2) DEFAULT 0,         -- 잔액
    branch VARCHAR(100),                      -- 거래점
    category VARCHAR(50) NOT NULL,            -- 자동 분류된 카테고리
    is_internal_transfer BOOLEAN DEFAULT FALSE, -- 본인계좌 자산이동 여부 (실지출 제외용)
    memo TEXT,                                -- 수기 메모
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 중복 방지 복합 유니크 제약
    CONSTRAINT uq_tx_record UNIQUE (tx_datetime, description, out_amt, in_amt, balance)
);

-- 2. 월별 집계 스냅샷 테이블 (빠른 대시보드 렌더링용)
CREATE TABLE IF NOT EXISTS monthly_financial_summaries (
    year_month VARCHAR(7) PRIMARY KEY,        -- 'YYYY-MM'
    salary_income NUMERIC(15, 2) DEFAULT 0,   -- 순수 근로소득
    other_income NUMERIC(15, 2) DEFAULT 0,    -- 기타 비경상 입금
    pure_expense NUMERIC(15, 2) DEFAULT 0,    -- 실질 가계지출 (자산이동 제외)
    card_expense NUMERIC(15, 2) DEFAULT 0,    -- 현대/신한카드 결제액
    fixed_expense NUMERIC(15, 2) DEFAULT 0,   -- 보험료, 부모님/배우자 고정송금
    irregular_expense NUMERIC(15, 2) DEFAULT 0, -- 경조사비, 비정기 송금
    child_edu_expense NUMERIC(15, 2) DEFAULT 0, -- 청주페이, 학원/용돈
    surplus_cash NUMERIC(15, 2) DEFAULT 0,    -- 잉여 현금 (급여 - 실지출)
    savings_rate NUMERIC(5, 2) DEFAULT 0,     -- 저축률 (%)
    card_mom_growth NUMERIC(5, 2) DEFAULT 0,  -- 카드값 전월 대비 증감률 (%)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseDdlSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSaveAndTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    saveSupabaseConfig({ url, anonKey });

    if (!url || !anonKey) {
      setTestResult({ success: false, message: 'Supabase URL과 Anon Key를 모두 입력해주세요.' });
      setIsTesting(false);
      return;
    }

    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);
    if (res.success) {
      onSupabaseConfigured();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">환경 설정 & Supabase 연동</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-300">
          
          {/* Section 1: Supabase DB 연결 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Supabase PostgreSQL 데이터베이스 연동</span>
              </span>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center space-x-1"
              >
                <span>대시보드 열기</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-400">
              Supabase Project Settings → API에서 Project URL과 anon public key를 복사하여 입력하세요. (미설정 시에도 브라우저 로컬 스토리지로 100% 작동합니다.)
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Project URL</label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Anon Public Key</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center space-x-3">
                <button
                  onClick={handleSaveAndTest}
                  disabled={isTesting}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>설정 저장 및 연결 테스트</span>
                </button>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs ${
                  testResult.success 
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}>
                  {testResult.message}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: PostgreSQL Schema DDL 복사 */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center space-x-2">
                <span>Supabase 테이블 생성 SQL (DDL)</span>
              </span>
              <button
                onClick={handleCopySql}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-brand-300 transition-colors"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? '복사됨!' : 'SQL 복사'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Supabase SQL Editor에 붙여넣어 실행하면 `transactions` 및 `monthly_financial_summaries` 테이블이 생성됩니다.
            </p>
            <div className="relative">
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
                {supabaseDdlSql}
              </pre>
            </div>
          </div>

          {/* Section 3: Vercel 배포 & 환경변수 안내 */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <span className="font-bold text-white flex items-center space-x-2">
              <Server className="w-4 h-4 text-brand-400" />
              <span>Vercel 무료 배포 & 환경 변수 설정 가이드</span>
            </span>
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
              <p className="font-semibold text-white">
                Vercel에 배포하면 PC가 꺼져도 iPhone/iPad에서 24시간 언제든 가계부를 열람할 수 있습니다.
              </p>
              <div className="space-y-1 text-slate-400">
                <p>1. GitHub 리포지토리에 본 프로젝트를 푸시한 뒤, <strong>Vercel</strong>에서 Import Project를 진행합니다.</p>
                <p>2. Vercel의 <strong>Environment Variables</strong> 설정에 아래 두 변수를 등록합니다:</p>
              </div>
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-brand-300 space-y-1">
                <div>NEXT_PUBLIC_SUPABASE_URL = (Supabase Project URL)</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY = (Supabase Anon Key)</div>
              </div>
              <p className="text-[11px] text-slate-400">
                배포 완료 후 발급되는 Vercel 도메인(예: <code className="text-brand-300">https://my-hana-dash.vercel.app</code>)으로 스마트폰에서 접속하면 끝입니다.
              </p>
            </div>
          </div>

          {/* Section 4: PWA (iPhone / iPad 홈 화면 추가) 가이드 */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <span className="font-bold text-white flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-brand-400" />
              <span>iPhone / iPad PWA 앱 설치 가이드</span>
            </span>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
              <p>1. <strong>iPhone/iPad Safari</strong>에서 배포된 URL에 접속합니다.</p>
              <p>2. 브라우저 하단 <strong>[공유] 아이콘</strong>을 탭합니다.</p>
              <p>3. 메뉴 목록에서 <strong>[홈 화면에 추가]</strong>를 누르면 상단 주소창이나 하단 툴바 없이 네이티브 앱처럼 전체화면으로 실행됩니다.</p>
            </div>
          </div>

          {/* Section 4: 데이터 관리 */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <span className="font-bold text-white">데이터 리셋 & 원본 복원</span>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={onRestoreInitialData}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
                <span>3년 치 실데이터 원본으로 복원</span>
              </button>
              <button
                onClick={onClearAllData}
                className="px-3 py-1.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 text-xs font-medium border border-rose-800/40 transition-all flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>모든 로컬 데이터 초기화</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            닫기
          </button>
        </div>

      </div>
    </div>
  );
};

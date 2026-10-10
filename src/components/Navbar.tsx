import { 
  Building2, 
  Database, 
  Upload, 
  Settings, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import { usePrivacy } from '../context/PrivacyContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSupabaseConnected: boolean;
  onOpenSettings: () => void;
  onOpenFileUpload: () => void;
  onResetData: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  totalTxCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSupabaseConnected,
  onOpenSettings,
  onOpenFileUpload,
  onRefreshData,
  isRefreshing = false,
  totalTxCount
}) => {
  const { isPrivate, togglePrivacy } = usePrivacy();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-2xl transition-all shadow-glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Logo */}
          <div 
            className="flex items-center space-x-3 cursor-pointer min-h-[44px] py-1 group" 
            onClick={() => setActiveTab('dashboard')}
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 p-[1px] shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-all duration-300">
              <div className="w-full h-full bg-slate-900/90 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-5 h-5 text-brand-400 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand-accent rounded-full border-2 border-slate-900 animate-pulse"></span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-brand-300 transition-colors">하나 가계부</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                  CFO Suite
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">3개년 입출금 기반 가계 지출 흐름 및 자산배분 대시보드</p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/70 border border-slate-800/80 p-1 rounded-xl backdrop-blur-md shadow-inner">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setActiveTab('unifiedCashFlow')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center gap-1.5 transition-all ${
                activeTab === 'unifiedCashFlow'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>통합 현금흐름</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-bold">All-in-One</span>
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center transition-all ${
                activeTab === 'benchmark'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              4인가구 벤치마크
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center transition-all ${
                activeTab === 'analytics'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              지출 트렌드
            </button>
            <button
              onClick={() => setActiveTab('cardAnalytics')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center transition-all ${
                activeTab === 'cardAnalytics'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              카드 소비 상세
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold min-h-[38px] flex items-center transition-all ${
                activeTab === 'transactions'
                  ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              거래내역 ({totalTxCount.toLocaleString()})
            </button>
          </nav>

          {/* Actions & Status */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Privacy Mode Toggle */}
            <button
              onClick={togglePrivacy}
              title={isPrivate ? "프라이버시 모드 켜짐 (금액 마스킹 해제하려면 클릭)" : "프라이버시 모드 끄기 (금액 숨기려면 클릭)"}
              className={`min-h-[40px] px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 text-xs font-medium active:scale-95 transition-all ${
                isPrivate
                  ? 'border-brand-400 bg-brand-500/20 text-brand-300 shadow-glow-brand'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {isPrivate ? <EyeOff className="w-4 h-4 text-brand-400" /> : <Eye className="w-4 h-4" />}
              <span className="hidden sm:inline">{isPrivate ? '금액 가림' : '금액 노출'}</span>
            </button>

            {/* Refresh/Sync button */}
            {onRefreshData && (
              <button
                onClick={onRefreshData}
                disabled={isRefreshing}
                title="데이터 동기화 / 새로고침"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all disabled:opacity-50 border border-transparent hover:border-slate-700"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
              </button>
            )}

            {/* Supabase status badge */}
            <button
              onClick={onOpenSettings}
              title={isSupabaseConnected ? "Supabase PostgreSQL 클라우드 연결됨" : "로컬 오프라인 모드 (클릭하여 Supabase 연동)"}
              className={`min-h-[40px] flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium active:scale-95 transition-all ${
                isSupabaseConnected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800/80'
              }`}
            >
              <Database className="w-4 h-4" />
              <span className="hidden sm:inline">{isSupabaseConnected ? '클라우드 DB' : '로컬 모드'}</span>
              {isSupabaseConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>

            {/* Upload Button */}
            <button
              onClick={onOpenFileUpload}
              className="min-h-[40px] flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-brand-500/25 active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">엑셀 업로드</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition-all border border-slate-800 hover:border-slate-700"
              title="설정 및 Vercel/Supabase 안내"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

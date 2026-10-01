import React from 'react';
import { LayoutDashboard, BarChart3, PieChart, ReceiptText, Upload } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenFileUpload: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenFileUpload
}) => {
  return (
    <nav 
      aria-label="모바일 하단 내비게이션"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-1.5 pt-1.5 safe-area-pb"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'dashboard' 
              ? 'text-brand-400 font-bold bg-brand-500/10' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">요약대시보드</span>
        </button>

        <button
          onClick={() => setActiveTab('benchmark')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'benchmark' 
              ? 'text-brand-400 font-bold bg-brand-500/10' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">4인 벤치</span>
        </button>

        {/* 중앙 플로팅 엑셀 업로드 버튼 */}
        <button
          onClick={onOpenFileUpload}
          title="엑셀 업로드"
          className="flex flex-col items-center justify-center -mt-5 min-w-[50px] min-h-[50px] w-12 h-12 bg-gradient-to-tr from-brand-600 to-brand-400 text-white rounded-full shadow-lg shadow-brand-500/40 active:scale-90 transition-transform border-2 border-slate-900"
        >
          <Upload className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'analytics' 
              ? 'text-brand-400 font-bold bg-brand-500/10' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">지출 트렌드</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all active:scale-95 ${
            activeTab === 'transactions' 
              ? 'text-brand-400 font-bold bg-brand-500/10' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 tracking-tight">거래내역</span>
        </button>
      </div>
    </nav>
  );
};

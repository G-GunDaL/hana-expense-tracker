import React, { useState, useMemo } from 'react';
import { ParsedTx } from '../types/finance';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/classifier';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  ShieldCheck, 
  Download, 
  Edit3, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface TransactionTableProps {
  transactions: ParsedTx[];
  onUpdateTransaction: (updatedTx: ParsedTx) => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onUpdateTransaction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [hideInternal, setHideInternal] = useState(true); // 기본: 홍승균 등 자산이동 제외
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // 수정 상태 (메모 및 카테고리)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editMemo, setEditMemo] = useState('');

  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  // 필터링 및 정렬
  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter(tx => {
      if (!tx) return false;
      // 1. 자산이동 격리 토글
      if (hideInternal && tx.isInternalTransfer) {
        return false;
      }

      // 2. 수입/지출 구분
      if (typeFilter === 'EXPENSE' && tx.outAmt === 0) return false;
      if (typeFilter === 'INCOME' && tx.inAmt === 0) return false;

      // 3. 카테고리 필터
      if (selectedCategory !== 'ALL' && tx.category !== selectedCategory) {
        return false;
      }

      // 4. 검색어 (적요, 거래점, 구분, 메모)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = tx.desc.toLowerCase().includes(term);
        const matchBranch = tx.branch.toLowerCase().includes(term);
        const matchType = tx.txType.toLowerCase().includes(term);
        const matchMemo = (tx.memo || '').toLowerCase().includes(term);
        if (!matchDesc && !matchBranch && !matchType && !matchMemo) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const cmp = a.txDatetime.localeCompare(b.txDatetime);
        return sortDirection === 'asc' ? cmp : -cmp;
      } else {
        const amtA = a.outAmt > 0 ? a.outAmt : a.inAmt;
        const amtB = b.outAmt > 0 ? b.outAmt : b.inAmt;
        return sortDirection === 'asc' ? amtA - amtB : amtB - amtA;
      }
    });
  }, [transactions, hideInternal, typeFilter, selectedCategory, searchTerm, sortField, sortDirection]);

  // 페이징 계산
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const startEdit = (tx: ParsedTx) => {
    setEditingId(tx.id);
    setEditCategory(tx.category);
    setEditMemo(tx.memo || '');
  };

  const saveEdit = (tx: ParsedTx) => {
    const updated: ParsedTx = {
      ...tx,
      category: editCategory as any,
      memo: editMemo,
      isInternalTransfer: editCategory.includes('자산이동') || editCategory.includes('자산이전')
    };
    onUpdateTransaction(updated);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // 엑셀 다운로드 기능
  const exportToExcel = () => {
    const exportData = filteredTransactions.map(t => ({
      '거래일시': t.txDatetime,
      '구분': t.txType,
      '적요': t.desc,
      '출금액(원)': t.outAmt,
      '입금액(원)': t.inAmt,
      '잔액(원)': t.balance,
      '거래점': t.branch,
      '카테고리': t.category,
      '자산이동여부': t.isInternalTransfer ? 'Y' : 'N',
      '메모': t.memo || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '거래내역');
    XLSX.writeFile(wb, `하나은행_거래내역_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 sm:p-6 shadow-glass">
      
      {/* 헤더 & 다운로드 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-2">
            <SlidersHorizontal className="w-5 h-5 text-brand-400" />
            <span>거래내역 정밀 필터 & 원본 대조</span>
          </h2>
          <p className="text-xs text-slate-400">
            총 {transactions.length.toLocaleString()}건 중 {filteredTransactions.length.toLocaleString()}건 표시
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>필터 결과 엑셀 저장</span>
        </button>
      </div>

      {/* 필터 컨트롤 바 */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
        
        {/* 검색 인풋 */}
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="적요, 거래점, 구분, 메모 검색..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 transition-all"
          />
        </div>

        {/* 카테고리 필터 드롭다운 */}
        <div className="lg:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 transition-all"
          >
            <option value="ALL">전체 카테고리</option>
            {Object.values(CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 입출금 구분 탭 */}
        <div className="lg:col-span-2 flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {(['ALL', 'EXPENSE', 'INCOME'] as const).map(type => (
            <button
              key={type}
              onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
              className={`flex-1 py-1 text-[11px] font-medium rounded-lg transition-all ${
                typeFilter === type ? 'bg-brand-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {type === 'ALL' ? '전체' : type === 'EXPENSE' ? '출금' : '입금'}
            </button>
          ))}
        </div>

        {/* 자산이동 격리 토글 스위치 (Harness Gate 검증의 핵심) */}
        <div className="lg:col-span-3 flex items-center justify-between sm:justify-end space-x-2 bg-slate-800/40 border border-purple-500/30 px-3 py-1.5 rounded-xl">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-purple-200 font-medium">자산이동 제외</span>
          </div>
          <button
            onClick={() => { setHideInternal(!hideInternal); setCurrentPage(1); }}
            className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
              hideInternal ? 'bg-purple-600' : 'bg-slate-700'
            }`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
              hideInternal ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

      </div>

      {/* 거래내역 반응형 테이블 */}
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/90 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th 
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  if (sortField === 'date') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortField('date'); setSortDirection('desc'); }
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>거래일시</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3">구분</th>
              <th className="py-3 px-4">적요 (상세내용)</th>
              <th 
                className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors"
                onClick={() => {
                  if (sortField === 'amount') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                  else { setSortField('amount'); setSortDirection('desc'); }
                }}
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>금액 (원)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-3 text-right hidden md:table-cell">잔액</th>
              <th className="py-3 px-3">카테고리</th>
              <th className="py-3 px-3 hidden lg:table-cell">메모 / 수기수정</th>
              <th className="py-3 px-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {paginatedTransactions.map((tx) => {
              const isEditing = editingId === tx.id;
              const isExpense = tx.outAmt > 0;
              const amount = isExpense ? tx.outAmt : tx.inAmt;

              return (
                <tr 
                  key={tx.id} 
                  className={`hover:bg-slate-800/40 transition-colors ${
                    tx.isInternalTransfer ? 'bg-purple-950/10' : ''
                  }`}
                >
                  {/* 일시 */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-300">
                    {tx.txDatetime}
                  </td>

                  {/* 구분 */}
                  <td className="py-3 px-3 whitespace-nowrap font-sans">
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                      {tx.txType}
                    </span>
                  </td>

                  {/* 적요 */}
                  <td className="py-3 px-4 font-sans font-medium text-white max-w-xs truncate">
                    <div className="flex items-center space-x-1.5">
                      <span>{tx.desc}</span>
                      {tx.branch && (
                        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                          ({tx.branch})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 금액 */}
                  <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                    isExpense ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {isExpense ? `-${amount.toLocaleString()}` : `+${amount.toLocaleString()}`}
                  </td>

                  {/* 잔액 */}
                  <td className="py-3 px-3 text-right text-slate-400 whitespace-nowrap hidden md:table-cell">
                    {tx.balance.toLocaleString()}
                  </td>

                  {/* 카테고리 */}
                  <td className="py-3 px-3 whitespace-nowrap font-sans">
                    {isEditing ? (
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="py-1 px-2 bg-slate-800 border border-slate-600 rounded text-xs text-white"
                      >
                        {Object.values(CATEGORIES).map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="px-2 py-0.5 rounded-md text-[11px] font-semibold border inline-flex items-center space-x-1"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[tx.category] || '#64748b'}20`,
                          borderColor: `${CATEGORY_COLORS[tx.category] || '#64748b'}50`,
                          color: CATEGORY_COLORS[tx.category] || '#e2e8f0'
                        }}
                      >
                        <span>{tx.category}</span>
                        {tx.isInternalTransfer && (
                          <span className="text-[9px] bg-purple-500/40 text-purple-200 px-1 rounded ml-1">자산이동</span>
                        )}
                      </span>
                    )}
                  </td>

                  {/* 메모 */}
                  <td className="py-3 px-3 font-sans hidden lg:table-cell">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="메모 입력"
                        className="w-full py-1 px-2 bg-slate-800 border border-slate-600 rounded text-xs text-white"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs italic">
                        {tx.memo || '-'}
                      </span>
                    )}
                  </td>

                  {/* 관리 (수정/저장) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap font-sans">
                    {isEditing ? (
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => saveEdit(tx)}
                          className="p-1 rounded bg-brand-500 hover:bg-brand-600 text-white"
                          title="저장"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300"
                          title="취소"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(tx)}
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="분류/메모 수정"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            일치하는 거래 내역이 없습니다.
          </div>
        )}
      </div>

      {/* 페이징 컨트롤 */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          페이지 <span className="font-bold text-white">{currentPage}</span> / {totalPages} (총 {filteredTransactions.length.toLocaleString()}건)
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
  );
};

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Files, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  X, 
  ShieldCheck,
  CreditCard,
  Calendar
} from 'lucide-react';
import { parseMultipleHyundaiCardFiles, MultiCardParseReport } from '../utils/hyundaiCardParser';
import { CardStatementTx } from '../types/finance';

interface CardFileUploaderProps {
  existingTransactions: CardStatementTx[];
  onUploadSuccess: (mergedTxs: CardStatementTx[], report: MultiCardParseReport) => void;
  onClose?: () => void;
}

export const CardFileUploader: React.FC<CardFileUploaderProps> = ({
  existingTransactions,
  onUploadSuccess,
  onClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<MultiCardParseReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsLoading(true);
    setErrorMessage(null);
    setReport(null);

    try {
      const { mergedTransactions, report: parseReport } = await parseMultipleHyundaiCardFiles(
        files,
        existingTransactions
      );

      setReport(parseReport);
      onUploadSuccess(mergedTransactions, parseReport);
    } catch (err: any) {
      console.error('Multi-card upload error:', err);
      setErrorMessage(err.message || '현대카드 명세서 파일 파싱 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleProcessFiles(e.target.files);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl relative max-w-2xl w-full mx-auto">
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-brand-400" />
          <span>현대카드 이용대금명세서 다중 일괄 업로더</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          1년치(2025.10 ~ 2026.09) 명세서 파일 11개를 한 번에 드래그하거나 개별 추가하세요. 소계/노이즈 행은 완벽 제거되며, 청구월 단위로 자동 갱신(Upsert)됩니다.
        </p>
      </div>

      {/* 다중 파일 드래그앤드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-brand-400 bg-brand-500/10' 
            : 'border-slate-700 hover:border-brand-500/60 bg-slate-950/60 hover:bg-slate-950/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx,.html,.csv"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
            {isLoading ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <Files className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {isLoading ? '명세서 일괄 분석 및 8대 카테고리 분류 중...' : '현대카드 명세서(.xls) 파일들을 모두 끌어오거나 클릭'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              11개 파일 다중 선택 가능 (HTML 테이블 형식 .xls 자동 파싱 지원)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-300">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 flex items-center space-x-1">
              <Calendar className="w-3 h-3 text-brand-300" />
              <span>청구월 자동 감지</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              <span>소계/합계 필터링 & 청구월 Upsert</span>
            </span>
          </div>
        </div>
      </div>

      {/* 성공 리포트 배너 */}
      {report && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-2 w-full">
              <p className="font-bold text-sm text-white">
                총 {report.filesProcessed}개 명세서 파일 일괄 처리 완료!
              </p>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300">
                <span>반영된 청구월: <strong className="text-brand-300">{report.replacedMonths.join(', ') || '없음'}</strong></span>
                <span>유효 거래: <strong className="text-emerald-400">{report.totalNewTxs.toLocaleString()}건</strong></span>
              </div>

              {/* 파일별 상세 현황 */}
              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
                {report.results.map((r, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 px-2 rounded bg-slate-900/60 text-[11px]">
                    <span className="truncate max-w-[240px] text-slate-300">{r.fileName}</span>
                    <span className="text-slate-400 font-mono">
                      {r.statementMonth ? `[${r.statementMonth}] ${r.validTxCount}건` : <span className="text-rose-400">오류</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 에러 배너 */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-white">파싱 오류</p>
            <p className="mt-0.5 text-rose-300">{errorMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
};

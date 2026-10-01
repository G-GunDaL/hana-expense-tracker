import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
import { parseHanaBankExcel, ParseResult } from '../utils/excelParser';
import { ParsedTx } from '../types/finance';

interface FileUploaderProps {
  existingTransactions: ParsedTx[];
  onUploadSuccess: (newTxs: ParsedTx[], result: ParseResult) => void;
  onClose?: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  existingTransactions,
  onUploadSuccess,
  onClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ParseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastResult(null);

    try {
      const result = await parseHanaBankExcel(file, existingTransactions);
      setLastResult(result);
      onUploadSuccess(result.newTransactions, result);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMessage(err.message || '엑셀 파일 파싱에 실패했습니다. 하나은행 과거거래내역서 양식을 확인해주세요.');
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
      const file = e.dataTransfer.files[0];
      await handleProcessFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleProcessFile(file);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl relative">
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="mb-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-brand-400" />
          <span>신규 거래내역서 업로드 하네스 (Deduplication Engine)</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          하나은행 과거거래내역서(.xls, .xlsx, .csv)를 드래그앤드롭하세요. 중복 거래는 100% 자동 스킵됩니다.
        </p>
      </div>

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging 
            ? 'border-brand-400 bg-brand-500/10' 
            : 'border-slate-700 hover:border-brand-500/60 bg-slate-950/50 hover:bg-slate-950/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
            {isLoading ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-7 h-7" />
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              {isLoading ? '엑셀 데이터 파싱 및 무결성 검증 중...' : '파일을 마우스로 끌어오거나 클릭하여 선택'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              지원 형식: .xls (하나은행 원본), .xlsx, .csv
            </p>
          </div>

          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>복합 유니크 제약(uq_tx_record) 기반 중복 방지 하네스 가동</span>
          </div>
        </div>
      </div>

      {/* 성공 리포트 배너 */}
      {lastResult && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
          <div className="flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm text-white">
                업로드 및 하네스 검증 성공!
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300">
                <span>총 파싱: <strong className="text-white">{lastResult.totalParsed}건</strong></span>
                <span>신규 추가: <strong className="text-emerald-400">{lastResult.newCount}건</strong></span>
                <span>중복 스킵: <strong className="text-amber-400">{lastResult.duplicateCount}건</strong></span>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-1">
                월별 집계 스냅샷(monthly_financial_summaries)과 4대 KPI가 자동 재계산되었습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 에러 배너 */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-white">업로드 오류</p>
            <p className="mt-0.5 text-rose-300">{errorMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
};

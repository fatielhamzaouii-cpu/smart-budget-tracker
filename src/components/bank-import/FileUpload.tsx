'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFile, loading }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onFile(accepted[0]);
    },
    [onFile],
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    onDropAccepted: () => setDragOver(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200
        ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'}
        ${loading ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center gap-4">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dragOver ? 'bg-indigo-100' : 'bg-white shadow-sm border border-slate-100'}`}>
          <svg className={`w-8 h-8 ${dragOver ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>

        <div>
          <p className="text-base font-semibold text-slate-700">
            {dragOver ? 'Drop your file here' : 'Drag & drop your bank statement'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            or <span className="text-indigo-600 font-medium">browse to upload</span>
          </p>
        </div>

        {/* Badge row */}
        <div className="flex items-center gap-2 mt-1">
          {['PDF', 'CSV'].map((ext) => (
            <span key={ext} className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-500">
              {ext}
            </span>
          ))}
          <span className="text-xs text-slate-400">· Attijariwafa Bank</span>
        </div>
      </div>
    </div>
  );
}

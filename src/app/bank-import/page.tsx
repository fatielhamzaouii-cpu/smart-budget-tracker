'use client';

import { useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import FileUpload from '@/components/bank-import/FileUpload';
import TransactionPreview from '@/components/bank-import/TransactionPreview';
import { ParsedTransaction } from '@/lib/parsers/classifier';

type Step = 'upload' | 'parsing' | 'preview' | 'saving' | 'done';

export default function BankImportPage() {
  const [step, setStep]               = useState<Step>('upload');
  const [file, setFile]               = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError]             = useState('');
  const [result, setResult]           = useState<{ saved: number; income: number; expenses: number } | null>(null);

  // ── Step 1 → 2: parse the file ─────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError('');
    setStep('parsing');

    const form = new FormData();
    form.append('file', f);

    try {
      const res = await fetch('/api/bank-import/parse', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to parse file.');
        setStep('upload');
        return;
      }

      if (!json.transactions?.length) {
        setError('No transactions found in the file. Make sure it is a valid Attijariwafa bank statement.');
        setStep('upload');
        return;
      }

      setTransactions(json.transactions);
      setStep('preview');
    } catch {
      setError('Network error. Please try again.');
      setStep('upload');
    }
  }, []);

  // ── Step 3 → 4: save confirmed transactions ─────────────────────────────────
  const handleImport = async () => {
    setStep('saving');
    setError('');

    try {
      const res = await fetch('/api/bank-import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to save transactions.');
        setStep('preview');
        return;
      }

      setResult(json);
      setStep('done');
    } catch {
      setError('Network error. Please try again.');
      setStep('preview');
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setTransactions([]);
    setError('');
    setResult(null);
  };

  // ── Income / expense quick stats ─────────────────────────────────────────────
  const incomeCount  = transactions.filter((t) => t.type === 'income').length;
  const expenseCount = transactions.filter((t) => t.type === 'expense').length;
  const salaryCount  = transactions.filter((t) => t.category === 'Salary').length;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bank Statement Import</h1>
            <p className="text-slate-500 mt-1 text-sm">
              Upload your Attijariwafa Bank statement (PDF or CSV) to auto-import transactions
            </p>
          </div>

          {step !== 'upload' && step !== 'done' && (
            <button onClick={reset} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Start over
            </button>
          )}
        </div>

        {/* ── Progress stepper ────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {(['upload', 'preview', 'done'] as const).map((s, idx) => {
            const labels = ['Upload File', 'Review & Edit', 'Done'];
            const active = step === s || (step === 'parsing' && s === 'upload') || (step === 'saving' && s === 'preview');
            const done   = (step === 'preview' && idx === 0) || (step === 'saving' && idx <= 1) || (step === 'done');
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 flex-1 ${idx > 0 ? 'border-t-2 pt-3' : 'pt-3'} ${done ? 'border-indigo-500' : 'border-slate-200'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                    ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? '✓' : idx + 1}
                  </span>
                  <span className={`text-sm font-medium ${active || done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {labels[idx]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Error banner ─────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-start">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* ── STEP: Upload ─────────────────────────────────────────── */}
        {(step === 'upload') && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <FileUpload onFile={handleFile} loading={false} />

            <div className="mt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-500">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🏦</div>
                <div className="font-medium text-slate-700">Attijariwafa Bank</div>
                <div>PDF & CSV supported</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🤖</div>
                <div className="font-medium text-slate-700">Auto-Classification</div>
                <div>Ads, salaries, transfers</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-2xl mb-1">🔒</div>
                <div className="font-medium text-slate-700">Private & Secure</div>
                <div>Your data stays yours</div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: Parsing ────────────────────────────────────────── */}
        {step === 'parsing' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 shadow-sm flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-slate-700 font-semibold">Analyzing statement…</p>
              <p className="text-slate-400 text-sm mt-1">
                Extracting transactions from <span className="font-medium">{file?.name}</span>
              </p>
            </div>
          </div>
        )}

        {/* ── STEP: Preview ────────────────────────────────────────── */}
        {step === 'preview' && (
          <>
            {/* Info bar */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-4 text-slate-700">
                <span>Found <strong>{transactions.length}</strong> transactions</span>
                <span className="text-green-600">↑ {incomeCount} income</span>
                <span className="text-red-600">↓ {expenseCount} expenses</span>
                {salaryCount > 0 && <span className="text-violet-600">👥 {salaryCount} salaries</span>}
              </div>
              <span className="text-slate-400 text-xs">Edit categories before importing</span>
            </div>

            <TransactionPreview transactions={transactions} onChange={setTransactions} />

            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <button onClick={reset} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!transactions.length}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-sm"
              >
                Import {transactions.length} Transactions →
              </button>
            </div>
          </>
        )}

        {/* ── STEP: Saving ─────────────────────────────────────────── */}
        {step === 'saving' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 shadow-sm flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
            </div>
            <p className="text-slate-700 font-semibold">Saving to database…</p>
          </div>
        )}

        {/* ── STEP: Done ───────────────────────────────────────────── */}
        {step === 'done' && result && (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800">Import Successful!</h3>
              <p className="text-slate-500 text-sm mt-1">Your transactions have been saved and the dashboard updated.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-800">{result.saved}</div>
                <div className="text-xs text-slate-500 mt-1">Total saved</div>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-700">{result.income}</div>
                <div className="text-xs text-slate-500 mt-1">Income</div>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-700">{result.expenses}</div>
                <div className="text-xs text-slate-500 mt-1">Expenses</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <a href="/dashboard" className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm text-sm">
                View Dashboard
              </a>
              <button onClick={reset} className="px-5 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all text-sm">
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

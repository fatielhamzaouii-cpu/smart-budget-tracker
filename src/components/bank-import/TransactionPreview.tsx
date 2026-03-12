'use client';

import { ParsedTransaction, TxType } from '@/lib/parsers/classifier';
import { formatCurrency } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Marketing & Ads', 'ATM Withdrawal', 'Card Payment', 'Food & Dining',
  'Travel', 'Rent & Housing', 'Utilities', 'Telecom', 'Insurance',
  'Bank Fees', 'Transfer Out', 'Shopping', 'Salary', 'Other Expense',
];
const INCOME_CATEGORIES = [
  'Client Payment', 'Refund', 'Salary Income', 'Cheque', 'Other Income',
];

interface Props {
  transactions: ParsedTransaction[];
  onChange: (updated: ParsedTransaction[]) => void;
}

export default function TransactionPreview({ transactions, onChange }: Props) {
  const update = (index: number, patch: Partial<ParsedTransaction>) => {
    const next = transactions.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(transactions.filter((_, i) => i !== index));
  };

  const income  = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const salary  = transactions.filter((t) => t.category === 'Salary').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Income</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(income)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(expense)}</p>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
          <p className="text-xs text-violet-600 font-medium uppercase tracking-wide">Salaries</p>
          <p className="text-xl font-bold text-violet-700 mt-1">{formatCurrency(salary)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  {/* Date */}
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">
                    {tx.date}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-slate-700 font-medium truncate" title={tx.description}>
                      {tx.description}
                    </p>
                  </td>

                  {/* Type toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => update(i, {
                        type: tx.type === 'income' ? 'expense' : 'income',
                        category: tx.type === 'income' ? 'Other Expense' : 'Other Income',
                      })}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition
                        ${tx.type === 'income'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'}`}
                    >
                      {tx.type === 'income' ? '↑ Income' : '↓ Expense'}
                    </button>
                  </td>

                  {/* Category */}
                  <td className="px-4 py-3">
                    <select
                      value={tx.category}
                      onChange={(e) => update(i, { category: e.target.value })}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full max-w-[160px]"
                    >
                      <optgroup label="Expense">
                        {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                      <optgroup label="Income">
                        {INCOME_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    </select>
                  </td>

                  {/* Employee */}
                  <td className="px-4 py-3">
                    {tx.employee_name ? (
                      <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-full text-xs font-medium capitalize">
                        {tx.employee_name}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">
                    <span className={tx.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </td>

                  {/* Remove */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(i)}
                      className="text-slate-300 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

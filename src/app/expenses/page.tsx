'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase';
import { Expense, Category } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ExpensesPage() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: expensesData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, categories(id, name, color, icon)')
        .order('date', { ascending: false }),
      supabase.from('categories').select('*'),
    ]);
    setExpenses(expensesData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    await supabase.from('expenses').delete().eq('id', id);
    loadData();
  };

  const filteredExpenses = expenses.filter(e => {
    if (filterCategory && e.category_id !== filterCategory) return false;
    if (filterMonth && !e.date.startsWith(filterMonth)) return false;
    if (searchQuery && !(e.notes || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
            <p className="text-slate-500 mt-1">Manage and track your spending</p>
          </div>
          <button
            onClick={() => { setEditingExpense(null); setModalOpen(true); }}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-200"
          >
            + Add Expense
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            >
              <option value="">All Categories</option>
              {categories.filter(c => c.type === 'expense').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
          </div>
          <div className="mt-3 text-sm text-slate-500">
            Showing {filteredExpenses.length} expenses - Total: <span className="font-semibold text-red-500">{formatCurrency(totalFiltered)}</span>
          </div>
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <EmptyState
            title="No expenses found"
            description="Start tracking your spending by adding your first expense."
            action={
              <button
                onClick={() => { setEditingExpense(null); setModalOpen(true); }}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl"
              >
                + Add Expense
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Receipt</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((expense) => {
                    const cat = expense.category as unknown as Category | null;
                    return (
                      <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(expense.date)}</td>
                        <td className="px-6 py-4">
                          {cat && (
                            <span
                              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: cat.color }}
                            >
                              {cat.name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{expense.notes || '-'}</td>
                        <td className="px-6 py-4">
                          {expense.receipt_url ? (
                            <a
                              href={expense.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-500 hover:text-purple-700 text-sm font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-slate-300 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-red-500">
                          {formatCurrency(Number(expense.amount))}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingExpense(expense); setModalOpen(true); }}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          categories={categories}
          expense={editingExpense}
          onSave={() => { setModalOpen(false); loadData(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </AppLayout>
  );
}

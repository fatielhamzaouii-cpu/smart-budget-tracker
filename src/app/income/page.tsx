'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import IncomeForm from '@/components/income/IncomeForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase';
import { Income, Category } from '@/types/database';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function IncomePage() {
  const supabase = createClient();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  const loadData = useCallback(async () => {
    const [{ data: incomeData }, { data: categoriesData }] = await Promise.all([
      supabase
        .from('income')
        .select('*, categories(id, name, color, icon)')
        .order('date', { ascending: false }),
      supabase.from('categories').select('*'),
    ]);
    setIncomes(incomeData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this income entry?')) return;
    await supabase.from('income').delete().eq('id', id);
    loadData();
  };

  const filteredIncomes = incomes.filter(i => {
    if (filterClient && !(i.client_name || '').toLowerCase().includes(filterClient.toLowerCase())) return false;
    if (filterMonth && !i.date.startsWith(filterMonth)) return false;
    return true;
  });

  const totalFiltered = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

  // Unique clients for quick stats
  const uniqueClients = new Set(incomes.map(i => i.client_name).filter(Boolean));

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Income</h1>
            <p className="text-slate-500 mt-1">Track payments from clients and other income sources</p>
          </div>
          <button
            onClick={() => { setEditingIncome(null); setModalOpen(true); }}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200"
          >
            + Add Income
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Income (filtered)</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(totalFiltered)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Entries</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{filteredIncomes.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Unique Clients</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{uniqueClients.size}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by client name..."
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            />
          </div>
        </div>

        {/* Income List */}
        {filteredIncomes.length === 0 ? (
          <EmptyState
            title="No income records found"
            description="Start tracking your income by adding your first entry."
            action={
              <button
                onClick={() => { setEditingIncome(null); setModalOpen(true); }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl"
              >
                + Add Income
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIncomes.map((income) => {
                    const cat = income.category as unknown as Category | null;
                    return (
                      <tr key={income.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(income.date)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{income.client_name || '-'}</td>
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
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{income.description || '-'}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-emerald-600">
                          +{formatCurrency(Number(income.amount))}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingIncome(income); setModalOpen(true); }}
                              className="p-2 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(income.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
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

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingIncome ? 'Edit Income' : 'Add Income'}
      >
        <IncomeForm
          categories={categories}
          income={editingIncome}
          onSave={() => { setModalOpen(false); loadData(); }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </AppLayout>
  );
}

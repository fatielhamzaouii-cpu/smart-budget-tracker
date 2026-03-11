'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase';
import { Budget, Category } from '@/types/database';
import { formatCurrency, calculatePercentage, getCurrentMonthRange, cn } from '@/lib/utils';

export default function BudgetsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState<(Budget & { spent: number })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [form, setForm] = useState({ category_id: '', amount: '', period: 'monthly' });

  const loadData = useCallback(async () => {
    const { start, end } = getCurrentMonthRange();

    const [{ data: budgetsData }, { data: categoriesData }, { data: expenses }] = await Promise.all([
      supabase.from('budgets').select('*, categories(id, name, color, icon)'),
      supabase.from('categories').select('*').eq('type', 'expense'),
      supabase.from('expenses').select('amount, category_id').gte('date', start).lte('date', end),
    ]);

    const budgetsWithSpent = (budgetsData || []).map(b => {
      const spent = (expenses || [])
        .filter(e => e.category_id === b.category_id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { ...b, spent };
    });

    setBudgets(budgetsWithSpent);
    setCategories(categoriesData || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      period: form.period,
    };

    if (editingBudget) {
      await supabase.from('budgets').update(payload).eq('id', editingBudget.id);
    } else {
      await supabase.from('budgets').insert(payload);
    }

    setModalOpen(false);
    setForm({ category_id: '', amount: '', period: 'monthly' });
    setEditingBudget(null);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    await supabase.from('budgets').delete().eq('id', id);
    loadData();
  };

  const openEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      category_id: budget.category_id,
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setModalOpen(true);
  };

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudgetCount = budgets.filter(b => b.spent > Number(b.amount)).length;

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Budgets</h1>
            <p className="text-slate-500 mt-1">Set spending limits per category</p>
          </div>
          <button
            onClick={() => {
              setEditingBudget(null);
              setForm({ category_id: '', amount: '', period: 'monthly' });
              setModalOpen(true);
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200"
          >
            + Set Budget
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Budget</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalBudget)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(totalSpent)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">Over Budget</p>
            <p className={cn("text-xl font-bold mt-1", overBudgetCount > 0 ? "text-red-500" : "text-emerald-600")}>
              {overBudgetCount} {overBudgetCount === 1 ? 'category' : 'categories'}
            </p>
          </div>
        </div>

        {/* Budget Cards */}
        {budgets.length === 0 ? (
          <EmptyState
            title="No budgets set"
            description="Create budgets to track spending limits per category."
            action={
              <button
                onClick={() => setModalOpen(true)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl"
              >
                + Set Budget
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map(budget => {
              const cat = budget.category as unknown as Category | null;
              const percentage = calculatePercentage(budget.spent, Number(budget.amount));
              const isOver = percentage > 100;
              const remaining = Number(budget.amount) - budget.spent;

              return (
                <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat?.color || '#6366f1' }} />
                      <h4 className="font-semibold text-slate-800">{cat?.name || 'Unknown'}</h4>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(budget)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(budget.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Budget: {formatCurrency(Number(budget.amount))}</span>
                      <span className={cn("font-medium", isOver ? "text-red-500" : "text-emerald-600")}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div
                        className={cn(
                          "h-3 rounded-full transition-all duration-500",
                          isOver ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Spent: {formatCurrency(budget.spent)}</span>
                      <span className={cn(isOver ? "text-red-500 font-medium" : "text-slate-400")}>
                        {isOver ? `Over by ${formatCurrency(Math.abs(remaining))}` : `${formatCurrency(remaining)} left`}
                      </span>
                    </div>
                  </div>

                  {isOver && (
                    <div className="mt-3 px-3 py-2 bg-red-50 rounded-lg">
                      <p className="text-xs text-red-600 font-medium">Budget exceeded! Review your spending.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Budget Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingBudget ? 'Edit Budget' : 'Set Budget'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Budget Amount (MAD) *</label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl">
            {editingBudget ? 'Update Budget' : 'Set Budget'}
          </button>
        </form>
      </Modal>
    </AppLayout>
  );
}

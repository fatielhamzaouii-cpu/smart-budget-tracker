'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MonthlyChart from '@/components/dashboard/MonthlyChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase';
import { formatCurrency, getCurrentMonthRange, getLastMonthRange, getMonthName, cn } from '@/lib/utils';
import { generateInsights, Insight } from '@/lib/insights';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from 'recharts';

export default function AnalyticsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number; savings: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'6' | '12'>('6');

  const loadAnalytics = useCallback(async () => {
    const { start, end } = getCurrentMonthRange();
    const lastMonth = getLastMonthRange();
    const months = parseInt(selectedPeriod);

    const startDate = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })();

    type ExpenseRow = { amount: number; date: string; category_id: string | null; categories: { name: string; color: string } | null };
    type IncomeRow = { amount: number; date: string; category_id: string | null; categories: { name: string; color: string } | null };
    type AmountRow = { amount: number };

    const { data: allExpenses } = await supabase.from('expenses').select('amount, date, category_id, categories(name, color)').gte('date', startDate).order('date') as { data: ExpenseRow[] | null };
    const { data: allIncome } = await supabase.from('income').select('amount, date, category_id, categories(name, color)').gte('date', startDate).order('date') as { data: IncomeRow[] | null };
    const { data: currentExpenses } = await supabase.from('expenses').select('amount, category_id, categories(name, color)').gte('date', start).lte('date', end) as { data: ExpenseRow[] | null };
    const { data: currentIncome } = await supabase.from('income').select('amount').gte('date', start).lte('date', end) as { data: AmountRow[] | null };
    const { data: lastExpenses } = await supabase.from('expenses').select('amount, category_id, categories(name, color)').gte('date', lastMonth.start).lte('date', lastMonth.end) as { data: ExpenseRow[] | null };
    const { data: lastIncome } = await supabase.from('income').select('amount').gte('date', lastMonth.start).lte('date', lastMonth.end) as { data: AmountRow[] | null };
    const { data: savings } = await supabase.from('savings').select('current_amount') as { data: { current_amount: number }[] | null };
    const { data: debts } = await supabase.from('debts').select('remaining_amount') as { data: { remaining_amount: number }[] | null };

    // Build monthly chart data
    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expenses: 0 });
    }

    allExpenses?.forEach(e => {
      const key = e.date.substring(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.expenses += Number(e.amount);
    });
    allIncome?.forEach(i => {
      const key = i.date.substring(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.income += Number(i.amount);
    });

    const chartData = Array.from(monthlyMap.entries()).map(([key, data]) => ({
      month: getMonthName(parseInt(key.split('-')[1]) - 1),
      income: data.income,
      expenses: data.expenses,
      savings: data.income - data.expenses,
    }));
    setMonthlyData(chartData);

    // Expense category pie
    const expCatMap = new Map<string, { value: number; color: string }>();
    currentExpenses?.forEach((e) => {
      const name = e.categories?.name || 'Uncategorized';
      const color = e.categories?.color || '#94a3b8';
      const cur = expCatMap.get(name) || { value: 0, color };
      cur.value += Number(e.amount);
      expCatMap.set(name, cur);
    });
    setCategoryData(Array.from(expCatMap.entries()).map(([name, { value, color }]) => ({ name, value, color })));

    // Income category pie
    const incCatMap = new Map<string, { value: number; color: string }>();
    allIncome?.forEach((i) => {
      const name = i.categories?.name || 'Uncategorized';
      const color = i.categories?.color || '#22c55e';
      const cur = incCatMap.get(name) || { value: 0, color };
      cur.value += Number(i.amount);
      incCatMap.set(name, cur);
    });
    setIncomeCategoryData(Array.from(incCatMap.entries()).map(([name, { value, color }]) => ({ name, value, color })));

    // Generate AI insights
    const totalCurrentExp = currentExpenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
    const totalCurrentInc = currentIncome?.reduce((s, i) => s + Number(i.amount), 0) || 0;
    const totalLastExp = lastExpenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
    const totalLastInc = lastIncome?.reduce((s, i) => s + Number(i.amount), 0) || 0;
    const totalSavings = savings?.reduce((s, sv) => s + Number(sv.current_amount), 0) || 0;
    const totalDebts = debts?.reduce((s, d) => s + Number(d.remaining_amount), 0) || 0;

    // Category spending comparison
    const lastCatMap = new Map<string, number>();
    lastExpenses?.forEach((e) => {
      const name = e.categories?.name || 'Uncategorized';
      lastCatMap.set(name, (lastCatMap.get(name) || 0) + Number(e.amount));
    });

    const categorySpending = Array.from(expCatMap.entries()).map(([name, { value }]) => ({
      name,
      current: value,
      previous: lastCatMap.get(name) || 0,
    }));

    const savingsRate = totalCurrentInc > 0 ? ((totalCurrentInc - totalCurrentExp) / totalCurrentInc) * 100 : 0;
    const lastSavingsRate = totalLastInc > 0 ? ((totalLastInc - totalLastExp) / totalLastInc) * 100 : 0;

    const aiInsights = generateInsights({
      currentMonthExpenses: totalCurrentExp,
      lastMonthExpenses: totalLastExp,
      currentMonthIncome: totalCurrentInc,
      lastMonthIncome: totalLastInc,
      totalSavings,
      totalDebts,
      categorySpending,
      savingsRate,
      lastSavingsRate,
    });
    setInsights(aiInsights);

    setLoading(false);
  }, [supabase, selectedPeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) return <AppLayout><LoadingSpinner /></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
            <p className="text-slate-500 mt-1">Deep dive into your financial data</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('6')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                selectedPeriod === '6' ? "bg-purple-100 text-purple-700" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              6 Months
            </button>
            <button
              onClick={() => setSelectedPeriod('12')}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                selectedPeriod === '12' ? "bg-purple-100 text-purple-700" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              12 Months
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI Financial Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={cn(
                  "p-4 rounded-xl backdrop-blur-sm",
                  insight.type === 'positive' && "bg-green-500/20 border border-green-400/30",
                  insight.type === 'negative' && "bg-red-500/20 border border-red-400/30",
                  insight.type === 'neutral' && "bg-white/10 border border-white/20"
                )}
              >
                <p className="text-sm leading-relaxed">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Income vs Expenses Chart */}
        <MonthlyChart data={monthlyData} />

        {/* Savings Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Savings Trend (Income - Expenses)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()} MAD`, '']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Area type="monotone" dataKey="savings" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Net Savings" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Pies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryPieChart data={categoryData} title="Expense Breakdown" />
          <CategoryPieChart data={incomeCategoryData} title="Income Sources" />
        </div>

        {/* Monthly Spending Trend */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Spending Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()} MAD`, '']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={3} dot={{ r: 5 }} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

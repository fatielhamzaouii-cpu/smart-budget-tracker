'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import StatCard from '@/components/ui/StatCard';
import MonthlyChart from '@/components/dashboard/MonthlyChart';
import CategoryPieChart from '@/components/dashboard/CategoryPieChart';
import SavingsChart from '@/components/dashboard/SavingsChart';
import BudgetOverview from '@/components/dashboard/BudgetOverview';
import RecentTransactions from '@/components/dashboard/RecentTransactions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { createClient } from '@/lib/supabase';
import { formatCurrency, getCurrentMonthRange, getLastMonthRange, getMonthName, calculatePercentage } from '@/lib/utils';

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalSavings: 0,
    totalDebts: 0,
    lastMonthExpenses: 0,
    lastMonthIncome: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [savingsData, setSavingsData] = useState<{ name: string; current: number; target: number }[]>([]);
  const [budgetData, setBudgetData] = useState<{ category: string; budget: number; spent: number; color: string }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<{
    id: string; type: 'income' | 'expense'; amount: number; description: string; category: string; date: string; color: string;
  }[]>([]);

  const loadDashboard = useCallback(async () => {
    const { start, end } = getCurrentMonthRange();
    const lastMonth = getLastMonthRange();

    type ExpRow = { amount: number; category_id: string | null; categories: { name: string; color: string } | null };
    type AmtRow = { amount: number };
    type SavRow = { name: string; current_amount: number; target_amount: number };
    type DebtRow = { remaining_amount: number };
    type BudgetRow = { category_id: string; amount: number; categories: { name: string; color: string } | null };
    type ExpDetailRow = { amount: number; date: string; notes: string | null; categories: { name: string; color: string } | null };
    type IncDetailRow = { amount: number; date: string; client_name: string | null; description: string | null; categories: { name: string; color: string } | null };

    const { data: currentExpenses } = await supabase.from('expenses').select('amount, category_id, categories(name, color)').gte('date', start).lte('date', end) as { data: ExpRow[] | null };
    const { data: currentIncome } = await supabase.from('income').select('amount').gte('date', start).lte('date', end) as { data: AmtRow[] | null };
    const { data: lastExpenses } = await supabase.from('expenses').select('amount').gte('date', lastMonth.start).lte('date', lastMonth.end) as { data: AmtRow[] | null };
    const { data: lastIncome } = await supabase.from('income').select('amount').gte('date', lastMonth.start).lte('date', lastMonth.end) as { data: AmtRow[] | null };
    const { data: savings } = await supabase.from('savings').select('*') as { data: SavRow[] | null };
    const { data: debts } = await supabase.from('debts').select('remaining_amount') as { data: DebtRow[] | null };
    const { data: budgets } = await supabase.from('budgets').select('*, categories(name, color)') as { data: BudgetRow[] | null };
    const { data: allExpenses } = await supabase.from('expenses').select('amount, date, notes, categories(name, color)').order('date', { ascending: false }).limit(10) as { data: ExpDetailRow[] | null };
    const { data: allIncome } = await supabase.from('income').select('amount, date, client_name, description, categories(name, color)').order('date', { ascending: false }).limit(10) as { data: IncDetailRow[] | null };

    const totalExpenses = currentExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const totalIncome = currentIncome?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;
    const totalSavings = savings?.reduce((sum, s) => sum + Number(s.current_amount), 0) || 0;
    const totalDebts = debts?.reduce((sum, d) => sum + Number(d.remaining_amount), 0) || 0;
    const lastMonthExpenses = lastExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
    const lastMonthIncome = lastIncome?.reduce((sum, i) => sum + Number(i.amount), 0) || 0;

    setStats({ totalIncome, totalExpenses, totalSavings, totalDebts, lastMonthExpenses, lastMonthIncome });

    // Category pie chart data
    const categoryMap = new Map<string, { value: number; color: string }>();
    currentExpenses?.forEach((e) => {
      const catName = e.categories?.name || 'Uncategorized';
      const color = e.categories?.color || '#94a3b8';
      const current = categoryMap.get(catName) || { value: 0, color };
      current.value += Number(e.amount);
      categoryMap.set(catName, current);
    });
    setCategoryData(Array.from(categoryMap.entries()).map(([name, { value, color }]) => ({ name, value, color })));

    // Savings data
    setSavingsData(savings?.map(s => ({
      name: s.name,
      current: Number(s.current_amount),
      target: Number(s.target_amount),
    })) || []);

    // Budget data with spending
    const budgetItems = budgets?.map((b) => {
      const spent = currentExpenses
        ?.filter((e) => e.category_id === b.category_id)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      return {
        category: b.categories?.name || 'Unknown',
        budget: Number(b.amount),
        spent,
        color: b.categories?.color || '#6366f1',
      };
    }) || [];
    setBudgetData(budgetItems);

    // Monthly chart (last 6 months)
    const monthlyMap = new Map<string, { income: number; expenses: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { income: 0, expenses: 0 });
    }

    type DateAmtRow = { amount: number; date: string };
    const sixMonthStart = (() => { const d = new Date(); d.setMonth(d.getMonth() - 5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; })();
    const { data: sixMonthExpenses } = await supabase.from('expenses').select('amount, date').gte('date', sixMonthStart) as { data: DateAmtRow[] | null };
    const { data: sixMonthIncome } = await supabase.from('income').select('amount, date').gte('date', sixMonthStart) as { data: DateAmtRow[] | null };

    sixMonthExpenses?.forEach(e => {
      const key = e.date.substring(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.expenses += Number(e.amount);
    });
    sixMonthIncome?.forEach(i => {
      const key = i.date.substring(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.income += Number(i.amount);
    });

    setMonthlyData(Array.from(monthlyMap.entries()).map(([key, data]) => ({
      month: getMonthName(parseInt(key.split('-')[1]) - 1),
      ...data,
    })));

    // Recent transactions
    const allTx = [
      ...(allExpenses?.map((e) => ({
        id: `exp-${e.date}-${e.amount}`,
        type: 'expense' as const,
        amount: Number(e.amount),
        description: e.notes || 'Expense',
        category: e.categories?.name || 'Uncategorized',
        date: e.date,
        color: e.categories?.color || '#ef4444',
      })) || []),
      ...(allIncome?.map((i) => ({
        id: `inc-${i.date}-${i.amount}`,
        type: 'income' as const,
        amount: Number(i.amount),
        description: i.client_name || i.description || 'Income',
        category: i.categories?.name || 'Income',
        date: i.date,
        color: i.categories?.color || '#22c55e',
      })) || []),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    setRecentTransactions(allTx);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  const expenseChange = stats.lastMonthExpenses > 0
    ? `${calculatePercentage(stats.totalExpenses - stats.lastMonthExpenses, stats.lastMonthExpenses)}% vs last month`
    : 'No data last month';
  const incomeChange = stats.lastMonthIncome > 0
    ? `${calculatePercentage(stats.totalIncome - stats.lastMonthIncome, stats.lastMonthIncome)}% vs last month`
    : 'No data last month';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 mt-1">Your financial overview for this month</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Income"
            value={formatCurrency(stats.totalIncome)}
            change={incomeChange}
            changeType={stats.totalIncome >= stats.lastMonthIncome ? 'positive' : 'negative'}
            color="green"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" /></svg>}
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            change={expenseChange}
            changeType={stats.totalExpenses <= stats.lastMonthExpenses ? 'positive' : 'negative'}
            color="red"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" /></svg>}
          />
          <StatCard
            title="Total Savings"
            value={formatCurrency(stats.totalSavings)}
            color="blue"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 1v8m0 0v1" /></svg>}
          />
          <StatCard
            title="Total Debts"
            value={formatCurrency(stats.totalDebts)}
            color="yellow"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyChart data={monthlyData} />
          <CategoryPieChart data={categoryData} title="Expenses by Category" />
        </div>

        {/* Budget & Savings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetOverview data={budgetData} />
          <SavingsChart data={savingsData} />
        </div>

        {/* Recent Transactions */}
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </AppLayout>
  );
}

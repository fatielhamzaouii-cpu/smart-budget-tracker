'use client';

import { formatCurrency, calculatePercentage, cn } from '@/lib/utils';

interface BudgetData {
  category: string;
  budget: number;
  spent: number;
  color: string;
}

export default function BudgetOverview({ data }: { data: BudgetData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Budget Status</h3>
        <div className="py-8 text-center text-slate-400">No budgets set</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Budget Status</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = calculatePercentage(item.spent, item.budget);
          const isOver = percentage > 100;
          const remaining = item.budget - item.spent;

          return (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{item.category}</span>
                <span className={cn(
                  "font-medium",
                  isOver ? "text-red-500" : "text-slate-500"
                )}>
                  {isOver ? 'Over by ' + formatCurrency(Math.abs(remaining)) : formatCurrency(remaining) + ' left'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all duration-500",
                    isOver ? "bg-red-500" :
                    percentage >= 80 ? "bg-amber-500" :
                    "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{formatCurrency(item.spent)} spent</span>
                <span>{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

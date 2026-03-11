'use client';

import { formatCurrency, calculatePercentage } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface SavingsData {
  name: string;
  current: number;
  target: number;
}

export default function SavingsChart({ data }: { data: SavingsData[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Savings Goals</h3>
        <div className="py-8 text-center text-slate-400">No savings goals yet</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Savings Goals</h3>
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = calculatePercentage(item.current, item.target);
          return (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{item.name}</span>
                <span className="text-slate-500">
                  {formatCurrency(item.current)} / {formatCurrency(item.target)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all duration-500",
                    percentage >= 100 ? "bg-emerald-500" :
                    percentage >= 50 ? "bg-blue-500" :
                    "bg-amber-500"
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{percentage}% complete</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

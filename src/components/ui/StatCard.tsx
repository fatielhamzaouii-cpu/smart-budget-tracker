'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'red' | 'blue' | 'yellow' | 'pink';
}

const colorMap = {
  purple: 'from-purple-500 to-purple-600',
  green: 'from-emerald-500 to-emerald-600',
  red: 'from-red-500 to-red-600',
  blue: 'from-blue-500 to-blue-600',
  yellow: 'from-amber-500 to-amber-600',
  pink: 'from-pink-500 to-pink-600',
};

const bgColorMap = {
  purple: 'bg-purple-50',
  green: 'bg-emerald-50',
  red: 'bg-red-50',
  blue: 'bg-blue-50',
  yellow: 'bg-amber-50',
  pink: 'bg-pink-50',
};

export default function StatCard({ title, value, change, changeType = 'neutral', icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        <div className={cn("p-2 rounded-xl", bgColorMap[color])}>
          <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white", colorMap[color])}>
            {icon}
          </div>
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      {change && (
        <p className={cn(
          "text-sm mt-2 font-medium",
          changeType === 'positive' && "text-emerald-600",
          changeType === 'negative' && "text-red-500",
          changeType === 'neutral' && "text-slate-500"
        )}>
          {changeType === 'positive' && '+'}{change}
        </p>
      )}
    </div>
  );
}

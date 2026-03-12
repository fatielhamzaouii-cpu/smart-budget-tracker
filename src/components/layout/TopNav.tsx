'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',  subtitle: 'Your financial overview' },
  '/income':     { title: 'Income',     subtitle: 'Manage your income sources' },
  '/expenses':   { title: 'Expenses',   subtitle: 'Track your spending' },
  '/budgets':    { title: 'Budgets',    subtitle: 'Control your budget limits' },
  '/analytics':  { title: 'Analytics', subtitle: 'Insights and trends' },
  '/profile':    { title: 'Profile',   subtitle: 'Your account settings' },
};

export default function TopNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('');
  const supabase = createClient();

  const page = pageTitles[pathname] ?? { title: 'Smart Budget', subtitle: '' };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const userEmail = data.user.email ?? '';
        const fullName = data.user.user_metadata?.full_name ?? '';
        setEmail(userEmail);
        if (fullName) {
          const parts = fullName.trim().split(' ');
          setInitials(parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2));
        } else {
          setInitials(userEmail.slice(0, 2).toUpperCase());
        }
      }
    });
  }, [supabase]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: page info */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 leading-tight">{page.title}</h2>
        <p className="text-xs text-slate-400 hidden sm:block">{today}</p>
      </div>

      {/* Right: user avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-slate-700 leading-tight truncate max-w-[200px]">{email}</p>
          <p className="text-xs text-slate-400">Logged in</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold select-none">
          {initials}
        </div>
      </div>
    </header>
  );
}

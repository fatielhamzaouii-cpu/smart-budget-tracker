import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ParsedTransaction } from '@/lib/parsers/classifier';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { transactions }: { transactions: ParsedTransaction[] } = await request.json();
  if (!transactions?.length) return NextResponse.json({ error: 'No transactions provided' }, { status: 400 });

  // Fetch user's existing categories to map names → ids
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, type')
    .eq('user_id', user.id);

  const catMap = new Map<string, string>(); // "name|type" → id
  categories?.forEach((c) => catMap.set(`${c.name.toLowerCase()}|${c.type}`, c.id));

  // Helper: find best matching category id
  const findCategoryId = (name: string, type: 'expense' | 'income'): string | null => {
    const key = `${name.toLowerCase()}|${type}`;
    if (catMap.has(key)) return catMap.get(key)!;
    // Partial match
    for (const [k, id] of catMap.entries()) {
      if (k.endsWith(`|${type}`) && k.split('|')[0].includes(name.toLowerCase().split(' ')[0])) {
        return id;
      }
    }
    return null;
  };

  // Save to `transactions` table (import log)
  const txRows = transactions.map((t) => ({
    user_id:        user.id,
    date:           t.date,
    description:    t.description,
    raw_description:t.raw_description,
    amount:         t.amount,
    type:           t.type,
    category:       t.category,
    employee_name:  t.employee_name ?? null,
    source:         'bank_import',
  }));

  const { error: txError } = await supabase.from('transactions').insert(txRows);
  if (txError) {
    console.error('transactions insert error:', txError);
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Also mirror to income / expenses tables so dashboard updates automatically
  const incomeRows = transactions
    .filter((t) => t.type === 'income')
    .map((t) => ({
      user_id:     user.id,
      amount:      t.amount,
      date:        t.date,
      description: t.description,
      category_id: findCategoryId(t.category, 'income'),
      notes:       `[Bank Import] ${t.raw_description}`,
    }));

  const expenseRows = transactions
    .filter((t) => t.type === 'expense')
    .map((t) => ({
      user_id:     user.id,
      amount:      t.amount,
      date:        t.date,
      notes:       `[Bank Import] ${t.raw_description}`,
      category_id: findCategoryId(t.category, 'expense'),
    }));

  if (incomeRows.length)  await supabase.from('income').insert(incomeRows);
  if (expenseRows.length) await supabase.from('expenses').insert(expenseRows);

  return NextResponse.json({
    saved: transactions.length,
    income:   incomeRows.length,
    expenses: expenseRows.length,
  });
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  currency: string;
  phone: string | null;
  business_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category_id: string | null;
  date: string;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  client_name: string | null;
  category_id: string | null;
  date: string;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Saving {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: 'stocks' | 'bonds' | 'real_estate' | 'crypto' | 'mutual_funds' | 'other';
  amount_invested: number;
  current_value: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  created_at: string;
  updated_at: string;
  category?: Category;
  spent?: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> };
      categories: { Row: Category; Insert: Omit<Category, 'id' | 'created_at'>; Update: Partial<Category> };
      expenses: { Row: Expense; Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'category'>; Update: Partial<Expense> };
      income: { Row: Income; Insert: Omit<Income, 'id' | 'created_at' | 'updated_at' | 'category'>; Update: Partial<Income> };
      savings: { Row: Saving; Insert: Omit<Saving, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Saving> };
      debts: { Row: Debt; Insert: Omit<Debt, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Debt> };
      investments: { Row: Investment; Insert: Omit<Investment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Investment> };
      budgets: { Row: Budget; Insert: Omit<Budget, 'id' | 'created_at' | 'updated_at' | 'category' | 'spent'>; Update: Partial<Budget> };
    };
  };
}

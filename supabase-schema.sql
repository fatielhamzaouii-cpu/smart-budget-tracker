-- ============================================
-- SMART BUDGET TRACKER - Complete Database Schema
-- PostgreSQL (Supabase)
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'MAD',
  phone TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'tag',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- Insert default categories for new users
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, type, color, icon) VALUES
    (NEW.id, 'Food & Dining', 'expense', '#ef4444', 'utensils'),
    (NEW.id, 'Transportation', 'expense', '#f97316', 'car'),
    (NEW.id, 'Housing & Rent', 'expense', '#eab308', 'home'),
    (NEW.id, 'Utilities', 'expense', '#22c55e', 'zap'),
    (NEW.id, 'Entertainment', 'expense', '#3b82f6', 'film'),
    (NEW.id, 'Shopping', 'expense', '#8b5cf6', 'shopping-bag'),
    (NEW.id, 'Healthcare', 'expense', '#ec4899', 'heart'),
    (NEW.id, 'Education', 'expense', '#14b8a6', 'book'),
    (NEW.id, 'Marketing', 'expense', '#f43f5e', 'megaphone'),
    (NEW.id, 'Office Expenses', 'expense', '#6366f1', 'briefcase'),
    (NEW.id, 'Salary', 'income', '#22c55e', 'banknote'),
    (NEW.id, 'Client Payment', 'income', '#3b82f6', 'users'),
    (NEW.id, 'Freelance', 'income', '#8b5cf6', 'laptop'),
    (NEW.id, 'Investment Returns', 'income', '#eab308', 'trending-up'),
    (NEW.id, 'Other Income', 'income', '#6b7280', 'plus-circle');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_create_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_categories();

-- ============================================
-- 3. EXPENSES TABLE
-- ============================================
CREATE TABLE public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_expenses_category ON public.expenses(category_id);

-- ============================================
-- 4. INCOME TABLE
-- ============================================
CREATE TABLE public.income (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  client_name TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_income_user_id ON public.income(user_id);
CREATE INDEX idx_income_date ON public.income(date);

-- ============================================
-- 5. SAVINGS TABLE
-- ============================================
CREATE TABLE public.savings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(12,2) DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_savings_user_id ON public.savings(user_id);

-- ============================================
-- 6. DEBTS TABLE
-- ============================================
CREATE TABLE public.debts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount > 0),
  remaining_amount DECIMAL(12,2) NOT NULL CHECK (remaining_amount >= 0),
  interest_rate DECIMAL(5,2) DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_debts_user_id ON public.debts(user_id);

-- ============================================
-- 7. INVESTMENTS TABLE
-- ============================================
CREATE TABLE public.investments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stocks', 'bonds', 'real_estate', 'crypto', 'mutual_funds', 'other')),
  amount_invested DECIMAL(12,2) NOT NULL CHECK (amount_invested > 0),
  current_value DECIMAL(12,2) DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id ON public.investments(user_id);

-- ============================================
-- 8. BUDGETS TABLE
-- ============================================
CREATE TABLE public.budgets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, period)
);

CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);

-- ============================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Categories: users can CRUD their own categories
CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Expenses: users can CRUD their own expenses
CREATE POLICY "Users can view own expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
  ON public.expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
  ON public.expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Income: users can CRUD their own income
CREATE POLICY "Users can view own income"
  ON public.income FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own income"
  ON public.income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
  ON public.income FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
  ON public.income FOR DELETE
  USING (auth.uid() = user_id);

-- Savings: users can CRUD their own savings
CREATE POLICY "Users can view own savings"
  ON public.savings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own savings"
  ON public.savings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings"
  ON public.savings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings"
  ON public.savings FOR DELETE
  USING (auth.uid() = user_id);

-- Debts: users can CRUD their own debts
CREATE POLICY "Users can view own debts"
  ON public.debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own debts"
  ON public.debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON public.debts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON public.debts FOR DELETE
  USING (auth.uid() = user_id);

-- Investments: users can CRUD their own investments
CREATE POLICY "Users can view own investments"
  ON public.investments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own investments"
  ON public.investments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investments"
  ON public.investments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investments"
  ON public.investments FOR DELETE
  USING (auth.uid() = user_id);

-- Budgets: users can CRUD their own budgets
CREATE POLICY "Users can view own budgets"
  ON public.budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON public.budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON public.budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 10. STORAGE BUCKET FOR RECEIPTS
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own receipts"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 11. UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_savings_updated_at
  BEFORE UPDATE ON public.savings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_debts_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON public.investments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 12. TRANSACTIONS TABLE (Bank Import Log)
-- ============================================
CREATE TABLE public.transactions (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date             DATE NOT NULL,
  description      TEXT NOT NULL,
  raw_description  TEXT,
  amount           DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  type             TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category         TEXT,
  employee_name    TEXT,
  source           TEXT DEFAULT 'bank_import',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date    ON public.transactions(date);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 13. EMPLOYEES TABLE
-- ============================================
CREATE TABLE public.employees (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  role       TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_user_id ON public.employees(user_id);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own employees"
  ON public.employees FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own employees"
  ON public.employees FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employees"
  ON public.employees FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employees"
  ON public.employees FOR DELETE USING (auth.uid() = user_id);

-- Auto-insert default employees when a new user signs up
CREATE OR REPLACE FUNCTION public.create_default_employees()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.employees (user_id, name, role) VALUES
    (NEW.id, 'basma baba',        'Employee'),
    (NEW.id, 'imane elhamzaoui',  'Employee'),
    (NEW.id, 'ilias hsain',       'Employee'),
    (NEW.id, 'oussama',           'Employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_user_create_employees
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_employees();

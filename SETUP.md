# Smart Budget Tracker - Complete Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- A Supabase account (free tier works)
- VS Code (recommended)
- Git

---

## Step 1: Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a name, password, and region (closest to Morocco for best performance)
3. Wait for the project to initialize

### Get Your API Keys

1. Go to **Settings > API** in your Supabase dashboard
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy the **anon public** key

---

## Step 2: Database Setup

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase-schema.sql` from this project
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run** to execute all queries

This will create:
- All 8 tables (profiles, categories, expenses, income, savings, debts, investments, budgets)
- Row Level Security policies on every table
- Automatic triggers (profile creation, default categories, timestamps)
- Storage bucket for receipt uploads

### Verify Tables

Go to **Table Editor** in Supabase and confirm these tables exist:
- profiles
- categories
- expenses
- income
- savings
- debts
- investments
- budgets

---

## Step 3: Supabase Auth Configuration

1. Go to **Authentication > Providers** in Supabase
2. Ensure **Email** provider is enabled
3. Optionally disable "Confirm email" for faster development testing:
   - Go to **Authentication > Settings**
   - Toggle off "Enable email confirmations" (re-enable for production)

---

## Step 4: Storage Setup

The SQL schema creates the `receipts` bucket automatically. Verify:
1. Go to **Storage** in Supabase dashboard
2. Confirm the `receipts` bucket exists
3. If not, create it manually:
   - Click "New bucket"
   - Name: `receipts`
   - Public: No

---

## Step 5: Local Development Setup

### Clone and Install

```bash
cd smart-budget-tracker
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace with your actual values from Step 1.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 6: Test the Application

1. Navigate to the signup page
2. Create a new account with email and password
3. You'll be redirected to the Dashboard
4. Default expense and income categories are auto-created
5. Try adding expenses, income, setting budgets
6. Check the Analytics page for AI insights

---

## Step 7: GitHub Repository Setup

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: Smart Budget Tracker"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/smart-budget-tracker.git

# Push to GitHub
git push -u origin main
```

---

## Step 8: Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Connect your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click "Deploy"

### Post-Deployment

1. Copy your Vercel deployment URL
2. In Supabase, go to **Authentication > URL Configuration**
3. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Project Structure

```
smart-budget-tracker/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── auth/               # Login, Signup, Callback
│   │   ├── dashboard/          # Main dashboard
│   │   ├── expenses/           # Expense management
│   │   ├── income/             # Income tracking
│   │   ├── analytics/          # Charts & AI insights
│   │   ├── budgets/            # Budget management
│   │   ├── profile/            # Profile & categories
│   │   └── api/                # REST API routes
│   │       ├── expenses/
│   │       ├── income/
│   │       ├── savings/
│   │       ├── debts/
│   │       ├── investments/
│   │       ├── budgets/
│   │       ├── categories/
│   │       └── profile/
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Generic UI (Modal, StatCard, etc.)
│   │   ├── layout/             # Sidebar, AppLayout
│   │   ├── dashboard/          # Charts, transaction list
│   │   ├── expenses/           # Expense form
│   │   └── income/             # Income form
│   ├── lib/                    # Utilities & Supabase clients
│   │   ├── supabase.ts         # Browser client
│   │   ├── supabase-server.ts  # Server client
│   │   ├── utils.ts            # Formatting, dates, helpers
│   │   └── insights.ts         # AI insight generation
│   └── types/                  # TypeScript type definitions
│       └── database.ts
├── supabase-schema.sql         # Complete database schema
├── .env.local.example          # Environment variable template
└── SETUP.md                    # This file
```

---

## API Endpoints

All endpoints require authentication via Supabase session cookies.

| Method | Endpoint           | Description                |
|--------|-------------------|----------------------------|
| GET    | /api/expenses     | List expenses (with filters)|
| POST   | /api/expenses     | Create expense             |
| PUT    | /api/expenses     | Update expense             |
| DELETE | /api/expenses?id= | Delete expense             |
| GET    | /api/income       | List income                |
| POST   | /api/income       | Create income              |
| PUT    | /api/income       | Update income              |
| DELETE | /api/income?id=   | Delete income              |
| GET    | /api/savings      | List savings goals         |
| POST   | /api/savings      | Create savings goal        |
| PUT    | /api/savings      | Update savings goal        |
| DELETE | /api/savings?id=  | Delete savings goal        |
| GET    | /api/debts        | List debts                 |
| POST   | /api/debts        | Create debt                |
| PUT    | /api/debts        | Update debt                |
| DELETE | /api/debts?id=    | Delete debt                |
| GET    | /api/investments  | List investments           |
| POST   | /api/investments  | Create investment          |
| PUT    | /api/investments  | Update investment          |
| DELETE | /api/investments?id= | Delete investment       |
| GET    | /api/budgets      | List budgets               |
| POST   | /api/budgets      | Create budget              |
| PUT    | /api/budgets      | Update budget              |
| DELETE | /api/budgets?id=  | Delete budget              |
| GET    | /api/categories   | List categories            |
| POST   | /api/categories   | Create category            |
| DELETE | /api/categories?id= | Delete category          |
| GET    | /api/profile      | Get profile                |
| PUT    | /api/profile      | Update profile             |

---

## Security Features

- **Row Level Security (RLS)**: Every table has policies ensuring users can only access their own data
- **Supabase Auth**: Secure email/password authentication with session management
- **Middleware**: Route protection - unauthenticated users are redirected to login
- **Storage policies**: Receipt uploads are scoped to user folders

---

## Currency

All financial data uses **Moroccan Dirham (MAD)** as the default currency.
The formatting uses `fr-MA` locale for proper display (e.g., `1,234.56 MAD`).

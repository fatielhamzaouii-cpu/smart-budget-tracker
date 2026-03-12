export type TxType = 'income' | 'expense';

export interface ParsedTransaction {
  date: string;          // YYYY-MM-DD
  description: string;
  raw_description: string;
  amount: number;
  type: TxType;
  category: string;
  employee_name?: string;
  source: 'bank_import';
}

// ── Salary employees ────────────────────────────────────────────────────────
const SALARY_EMPLOYEES = [
  'basma baba',
  'imane elhamzaoui',
  'ilias hsain',
  'oussama',
];

// ── Expense classification rules (order matters — first match wins) ─────────
const EXPENSE_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /FACEBK|FACEBOOK/i,                          category: 'Marketing & Ads' },
  { pattern: /GOOGLE\s*ADS|GOOGLEADS/i,                   category: 'Marketing & Ads' },
  { pattern: /INSTAGRAM|TIKTOK|SNAPCHAT/i,                category: 'Marketing & Ads' },
  { pattern: /\bGAB\b/i,                                  category: 'ATM Withdrawal' },
  { pattern: /PAIEMENT\s*CB/i,                            category: 'Card Payment' },
  { pattern: /RESTAURANT|CAFE|BOULANGERIE|PATISSERIE|SNACK/i, category: 'Food & Dining' },
  { pattern: /HOTEL|RIAD|HAMMAM/i,                        category: 'Travel' },
  { pattern: /AIR ARABIA|ROYAL AIR|RAM\b|AEROPORT/i,      category: 'Travel' },
  { pattern: /LOYER|LOCATION|IMMO/i,                      category: 'Rent & Housing' },
  { pattern: /ELECTRICITE|LYDEC|ONE\b|EAU\b/i,            category: 'Utilities' },
  { pattern: /TELEPHONE|TELECOM|MAROC TELECOM|IAM\b|INWI|ORANGE/i, category: 'Telecom' },
  { pattern: /ASSURANCE/i,                                category: 'Insurance' },
  { pattern: /FRAIS|COMMISSION|AGIOS|TIMBRE/i,            category: 'Bank Fees' },
  { pattern: /VIR\s*INST\s*EMIS|VIREMENT\s*EMIS|VIR\.EMIS/i, category: 'Transfer Out' },
  { pattern: /AMAZON|JUMIA|AliExpress/i,                  category: 'Shopping' },
];

// ── Income classification rules ──────────────────────────────────────────────
const INCOME_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /VIR\.WEB\s*RECU|VIR\s*INST\s*RECU|VIREMENT\s*RECU|VIR\s*RECU/i, category: 'Client Payment' },
  { pattern: /REMBOURSEMENT/i,                            category: 'Refund' },
  { pattern: /SALAIRE|SALARY/i,                           category: 'Salary Income' },
  { pattern: /CHEQUE/i,                                   category: 'Cheque' },
];

// ── Parse Moroccan number format: "5 000,00" → 5000.00 ──────────────────────
export function parseMoroccanAmount(raw: string): number {
  return parseFloat(raw.replace(/\s/g, '').replace(',', '.')) || 0;
}

// ── Parse DD/MM/YYYY → YYYY-MM-DD ───────────────────────────────────────────
export function parseFrenchDate(raw: string): string {
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // Try YYYY-MM-DD passthrough
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return raw.trim();
  return raw.trim();
}

// ── Main classifier ──────────────────────────────────────────────────────────
export function classify(
  description: string,
  amount: number,
  isCredit: boolean,
): Pick<ParsedTransaction, 'type' | 'category' | 'employee_name'> {
  const type: TxType = isCredit ? 'income' : 'expense';
  const lower = description.toLowerCase();

  if (!isCredit) {
    // Check salary employees first
    for (const emp of SALARY_EMPLOYEES) {
      if (lower.includes(emp.toLowerCase())) {
        return { type, category: 'Salary', employee_name: emp };
      }
    }
    // Check expense rules
    for (const { pattern, category } of EXPENSE_RULES) {
      if (pattern.test(description)) return { type, category };
    }
    return { type, category: 'Other Expense' };
  }

  // Income rules
  for (const { pattern, category } of INCOME_RULES) {
    if (pattern.test(description)) return { type, category };
  }
  return { type, category: 'Other Income' };
}

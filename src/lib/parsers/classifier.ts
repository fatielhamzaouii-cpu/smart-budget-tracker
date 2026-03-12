export type TxType = 'income' | 'expense';

export interface ParsedTransaction {
  date: string;           // YYYY-MM-DD
  description: string;
  raw_description: string;
  amount: number;
  type: TxType;
  category: string;
  employee_name?: string;
  source: 'bank_import';
}

// ── Salary employees (lowercase for matching) ─────────────────────────────
const SALARY_EMPLOYEES = [
  'basma baba',
  'imane elhamzaoui',
  'ilias hsain',
  'iliass hsain',   // variant spelling seen in real statement
  'oussama',
];

// ── Expense rules (first match wins) ──────────────────────────────────────
const EXPENSE_RULES: { pattern: RegExp; category: string }[] = [
  // Salary transfers to employees (checked separately below, but fallback here)
  { pattern: /VIR\s*INST\s*EMIS\s*VERS|VIR\.EMIS\s*WEB\s*VERS/i,  category: 'Transfer Out' },

  // Ads & marketing
  { pattern: /FACEBK|FACEBOOK/i,                                    category: 'Marketing & Ads' },
  { pattern: /GOOGLE\s*ADS?/i,                                      category: 'Marketing & Ads' },
  { pattern: /INSTAGRAM|TIKTOK/i,                                   category: 'Marketing & Ads' },

  // ATM / cash
  { pattern: /\bAWBGAB\b|\bGAB\b/i,                                category: 'ATM Withdrawal' },
  { pattern: /FRAIS\/RETRAIT\s*ESP\s*GAB/i,                         category: 'Bank Fees' },

  // Card payments
  { pattern: /PAIEMENT\s*CB/i,                                      category: 'Card Payment' },

  // Telecom
  { pattern: /PAIEMENT\s*IAM|RECHARGE\s*HB|MAROC\s*TELECOM|INWI|ORANGE/i, category: 'Telecom' },

  // Food & dining
  { pattern: /MCDO|MCDONALD|STARBUCKS|BRIDGEPORT.*REST|RESTAURANT|CAFE|BOULANGERIE|SNACK/i, category: 'Food & Dining' },

  // Travel & transport
  { pattern: /HYATT|RIAD|HOTEL/i,                                   category: 'Travel' },
  { pattern: /AIR\s*ARABIA|ROYAL\s*AIR|RAM\b|AEROPORT/i,            category: 'Travel' },
  { pattern: /ARABIA\s*TAXI|TRANSPORT.*LUX|LUXURY\s*CAR|Talabat/i,  category: 'Travel' },

  // Health
  { pattern: /CENTRE\s*DENTAIR|HEALTH\s*CARE|TRUDOC|CLINIQUE/i,     category: 'Healthcare' },

  // Shopping & fashion
  { pattern: /RED\s*TREES\s*FASHION|AMAZON|JUMIA/i,                 category: 'Shopping' },

  // Subscriptions / digital
  { pattern: /VMO\*VIMEO|VIMEO|NETFLIX|SPOTIFY/i,                   category: 'Subscriptions' },

  // Bank fees & commissions
  { pattern: /COMM\s*VIR\s*EMIS|COMMI-DDG|FRAIS|COMMISSION|AGIOS/i, category: 'Bank Fees' },
  { pattern: /OPERATION\s*AU\s*DEBIT/i,                             category: 'Bank Fees' },

  // Money transfers / cash services
  { pattern: /MAD\s*WAFACASH|WAFACASH/i,                            category: 'Transfer Out' },

  // Utilities
  { pattern: /ELECTRICITE|LYDEC|\bONE\b|\bEAU\b|LOYER|LOCATION/i,  category: 'Utilities' },

  // Insurance
  { pattern: /ASSURANCE/i,                                          category: 'Insurance' },
];

// ── Income rules ───────────────────────────────────────────────────────────
const INCOME_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /VIR\.WEB\s*RECU\s*DE|VIR\s*INST\s*RECU\s*DE/i,      category: 'Client Payment' },
  { pattern: /VIREMENT\s*RECU\s*DE/i,                               category: 'Client Payment' },
  { pattern: /VERSEMENT\s*ESPECE/i,                                  category: 'Cash Deposit' },
  { pattern: /REMBOURSEMENT/i,                                       category: 'Refund' },
  { pattern: /SALAIRE|SALARY/i,                                     category: 'Salary Income' },
  { pattern: /CHEQUE/i,                                             category: 'Cheque' },
];

export function classify(
  description: string,
  amount: number,
  isCredit: boolean,
): Pick<ParsedTransaction, 'type' | 'category' | 'employee_name'> {
  const type: TxType = isCredit ? 'income' : 'expense';
  const lower = description.toLowerCase();

  if (!isCredit) {
    // Check if this is a salary payment to a named employee
    for (const emp of SALARY_EMPLOYEES) {
      if (lower.includes(emp.toLowerCase())) {
        return { type, category: 'Salary', employee_name: emp };
      }
    }
    // Match expense rules
    for (const { pattern, category } of EXPENSE_RULES) {
      if (pattern.test(description)) return { type, category };
    }
    return { type, category: 'Other Expense' };
  }

  // Match income rules
  for (const { pattern, category } of INCOME_RULES) {
    if (pattern.test(description)) return { type, category };
  }
  return { type, category: 'Other Income' };
}

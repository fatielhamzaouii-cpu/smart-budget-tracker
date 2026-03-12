import { classify, parseFrenchDate, parseMoroccanAmount, ParsedTransaction } from './classifier';

/**
 * Extracts transactions from Attijariwafa Bank PDF statements.
 *
 * Statement lines look like one of these patterns:
 *   01/03/2024   VIR.WEB RECU DE CLIENT NAME         5 000,00
 *   01/03/2024   PAIEMENT CB AMAZON             500,00
 *   01/03/2024   VIR INST RECU                           12 500,00     25 000,00
 *
 * Columns: DATE  DESCRIPTION  [DEBIT]  [CREDIT]  [BALANCE]
 * Amounts use Moroccan format: "5 000,00" (space thousands, comma decimal)
 */

// Matches an amount in Moroccan/French number format: 1 234,56  or  1234,56  or  1234.56
const AMT_RE = /\d{1,3}(?:[\s\u00a0]\d{3})*(?:[.,]\d{2})/g;

// A transaction line starts with DD/MM/YYYY
const LINE_RE = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/;

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  // Dynamic import so Next.js doesn't bundle pdf-parse for the client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const text: string = data.text;

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const match = line.match(LINE_RE);
    if (!match) continue;

    const rawDate = match[1];
    const rest    = match[2].trim();

    // Extract all amount-like tokens from the rest of the line
    const amountTokens = rest.match(AMT_RE) ?? [];
    if (!amountTokens.length) continue;

    // The description is everything before the first amount token
    const firstAmtIdx = rest.indexOf(amountTokens[0]);
    const rawDesc = rest.slice(0, firstAmtIdx).trim().replace(/\s+/g, ' ');
    if (!rawDesc) continue;

    const date = parseFrenchDate(rawDate);

    // Attijariwafa statements: if 2+ amounts → [debit, credit] or [credit, balance]
    // Heuristic: if the last amount (balance) >> first amount, treat first as debit/credit
    let debit  = 0;
    let credit = 0;

    if (amountTokens.length === 1) {
      // Only one amount — need to infer direction from description
      const amt = parseMoroccanAmount(amountTokens[0]);
      const isIncome = /RECU|REÇU|CREDIT|REMBOURSEMENT|SALAIRE/i.test(rawDesc);
      if (isIncome) credit = amt; else debit = amt;
    } else if (amountTokens.length === 2) {
      // Two amounts: [debit, credit] or [amount, balance]
      const a = parseMoroccanAmount(amountTokens[0]);
      const b = parseMoroccanAmount(amountTokens[1]);
      // Balance is typically much larger — if b > a * 2, b is probably balance
      if (b > a * 2) {
        const isIncome = /RECU|REÇU|CREDIT|REMBOURSEMENT|SALAIRE/i.test(rawDesc);
        if (isIncome) credit = a; else debit = a;
      } else {
        // Both are transaction amounts (rare: debit + credit on same line)
        debit  = a;
        credit = b;
      }
    } else {
      // 3+ amounts: first = debit, second = credit, rest = balance
      debit  = parseMoroccanAmount(amountTokens[0]);
      credit = parseMoroccanAmount(amountTokens[1]);
    }

    if (debit === 0 && credit === 0) continue;

    const isCredit = credit > 0 && credit >= debit;
    const amount   = isCredit ? credit : debit;

    const { type, category, employee_name } = classify(rawDesc, amount, isCredit);

    transactions.push({
      date,
      description: rawDesc,
      raw_description: rest,
      amount,
      type,
      category,
      employee_name,
      source: 'bank_import',
    });
  }

  return transactions;
}

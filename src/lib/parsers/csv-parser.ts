import Papa from 'papaparse';
import { classify, parseFrenchDate, parseMoroccanAmount, ParsedTransaction } from './classifier';

// Normalise header strings to a lowercase ASCII key
function normalise(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9]/g, '');       // strip non-alphanumeric
}

// Find a column by a set of possible normalised header names
function findCol(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(normalise(h)));
}

export function parseCSV(text: string): ParsedTransaction[] {
  // Detect delimiter: Attijariwafa exports use semicolons
  const delimiter = text.includes(';') ? ';' : ',';

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (!result.data.length) return [];

  const headers = Object.keys(result.data[0]);

  const dateCol    = findCol(headers, ['date', 'dateope', 'dateoperation', 'datevaleur']);
  const descCol    = findCol(headers, ['libelle', 'description', 'motif', 'libelle1', 'libelledetaille', 'detail']);
  const debitCol   = findCol(headers, ['debit', 'montantdebit', 'sortie', 'montantsortie']);
  const creditCol  = findCol(headers, ['credit', 'montantcredit', 'entree', 'montantentree']);
  const amountCol  = findCol(headers, ['montant', 'amount', 'valeur']);

  const transactions: ParsedTransaction[] = [];

  for (const row of result.data) {
    const rawDate = dateCol ? row[dateCol] : '';
    const rawDesc = descCol ? row[descCol] : Object.values(row).join(' ');
    if (!rawDate || !rawDesc) continue;

    const desc = rawDesc.trim();
    const date = parseFrenchDate(rawDate.trim());
    if (!date) continue;

    let debit  = debitCol  ? parseMoroccanAmount(row[debitCol]  ?? '') : 0;
    let credit = creditCol ? parseMoroccanAmount(row[creditCol] ?? '') : 0;

    // If only a single amount column exists, use sign to determine direction
    if (!debit && !credit && amountCol) {
      const val = parseMoroccanAmount(row[amountCol] ?? '');
      if (val < 0) debit = Math.abs(val);
      else credit = val;
    }

    // Skip rows with no amount
    if (debit === 0 && credit === 0) continue;

    const isCredit = credit > 0;
    const amount   = isCredit ? credit : debit;
    const { type, category, employee_name } = classify(desc, amount, isCredit);

    transactions.push({
      date,
      description: desc,
      raw_description: desc,
      amount,
      type,
      category,
      employee_name,
      source: 'bank_import',
    });
  }

  return transactions;
}

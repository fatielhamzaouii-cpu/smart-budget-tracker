import { classify, ParsedTransaction } from './classifier';

/**
 * Parser for Attijariwafa Bank "Relevé de Compte" PDF statements.
 *
 * ACTUAL LINE FORMAT (from the real PDF):
 *   CODE  DD MM  DESCRIPTION  DD MM YYYY  AMOUNT
 *
 * Examples:
 *   0016BK 04 02 VIR.WEB RECU DE MERIZAK 04 02 2026 4 500,00
 *   0016MI 04 02 PAIEMENT CB 01/02/26 BIM MEKNE04 02 2026 379,60
 *   0016C0 05 02 VIR INST RECU DE MLLE MSALLEK MANAL05 02 2026 2 500,00
 *   0016F0 16 02 VIR INST EMIS VERS basma baba 16 02 2026 3 000,00
 *
 * Key observations:
 * - Lines start with a bank CODE (e.g. 0016BK), NOT a date
 * - The value date (DD MM YYYY) appears at the END of the line
 * - Sometimes description is truncated and date is glued directly to last word
 * - Amount uses Moroccan format: 4 500,00 (space = thousands, comma = decimal)
 * - No separate debit/credit columns in text — infer from description
 */

// Matches a Moroccan-format amount at end of string: 4 500,00 or 100,00
const AMOUNT_RE = /(\d{1,3}(?:[\s\u00a0]\d{3})*[,\.]\d{2})\s*$/;

// A transaction line starts with a bank code (4–8 uppercase+digit chars)
// followed by two small numbers (operation date DD MM), then description, then value date + amount
const LINE_RE = /^\s*([A-Z0-9]{4,8})\s+\d{1,2}\s+\d{2}\s+(.*?)\s*(\d{2})\s+(\d{2})\s+(\d{4})\s+(\d[\d\s]*[,\.]\d{2})\s*$/;

// Lines to skip (headers, footers, totals)
const SKIP_RE = /TOTAL MOUVEMENTS|SOLDE|PAGE\s+\d|CREDITEUR|DEBITEUR|LIBELLE|VALEUR|DEBIT$|^CREDIT$|CAPITAUX|Attijariwafa|banque|soci.t. anonyme|RELEVE|AGENCE|DEVISE|COMPTE|ARRETE|MOROCCO|DIRHAM|MEKNES|Casablanca|boulevard|ICE\s|RC\s|CNSS/i;

/**
 * Parse date from DD MM YYYY parts → YYYY-MM-DD
 */
function toISODate(dd: string, mm: string, yyyy: string): string {
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

/**
 * Parse Moroccan amount string → number
 * "4 500,00" → 4500.00,  "1 000,00" → 1000.00
 */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/[\s\u00a0]/g, '').replace(',', '.')) || 0;
}

/**
 * Determine if a transaction is CREDIT (income) based on description.
 * Everything else is DEBIT (expense).
 */
function isIncome(desc: string): boolean {
  return /\bRECU\b|VERSEMENT\s*ESPECE|REMBOURSEMENT/i.test(desc);
}

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();

  const lines = result.text
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim())
    .filter((l) => l.length > 0);

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    // Skip headers, footers, totals
    if (SKIP_RE.test(line)) continue;

    const match = line.match(LINE_RE);
    if (!match) continue;

    // match[1] = CODE, match[2] = raw description, match[3] = DD, match[4] = MM, match[5] = YYYY, match[6] = amount
    const rawDesc = match[2].trim().replace(/\s+/g, ' ');
    const date    = toISODate(match[3], match[4], match[5]);
    const amount  = parseAmount(match[6]);

    if (!rawDesc || amount <= 0) continue;

    // Clean up description: strip trailing digits that leaked from date concat
    // e.g. "BIM MEKNE04" → "BIM MEKNE" (the 04 was start of date DD)
    const cleanDesc = rawDesc.replace(/\d{2}$/, '').trim();
    const description = cleanDesc || rawDesc;

    const credit = isIncome(description);
    const { type, category, employee_name } = classify(description, amount, credit);

    transactions.push({
      date,
      description,
      raw_description: rawDesc,
      amount,
      type,
      category,
      employee_name,
      source: 'bank_import',
    });
  }

  return transactions;
}

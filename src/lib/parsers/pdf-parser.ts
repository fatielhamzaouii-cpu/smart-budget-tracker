import { classify, parseFrenchDate, parseMoroccanAmount, ParsedTransaction } from './classifier';

/**
 * PDF parser for Attijariwafa Bank statements using pdf-parse v2.
 *
 * Transaction lines have the format:
 *   DD/MM/YYYY  DESCRIPTION               DEBIT    CREDIT    BALANCE
 * Amounts use French/Moroccan format: "5 000,00" (space = thousands, comma = decimal)
 */

// Amount pattern: 1 234,56  or  1234,56  or  1234.56
const AMT_RE = /\d{1,3}(?:[\s\u00a0]\d{3})*[,\.]\d{2}/g;

// Transaction line starts with DD/MM/YYYY followed by content
const LINE_RE = /^(\d{2}\/\d{2}\/\d{4})\s+(.+)$/;

// Keywords that indicate a line is a transaction
const TX_KEYWORDS = /VIR|VIREMENT|PAIEMENT|GAB|CB|FACEBK|REMISE|CHEQUE|PRELEVEMENT|RECU|EMIS|RETRAIT|DEPOT|SALAIRE/i;

function extractTransactionsFromText(text: string): ParsedTransaction[] {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/\r/g, '').trim())
    .filter(Boolean);

  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    // Must start with a date
    const match = line.match(LINE_RE);
    if (!match) continue;

    const rawDate = match[1];
    const rest    = match[2].trim();

    // Must contain a transaction keyword
    if (!TX_KEYWORDS.test(rest)) continue;

    // Extract all amount tokens
    const amountTokens = rest.match(AMT_RE) ?? [];
    if (!amountTokens.length) continue;

    // Description = everything before the first amount token
    const firstAmtIdx = rest.indexOf(amountTokens[0]);
    const rawDesc = rest.slice(0, firstAmtIdx).trim().replace(/\s+/g, ' ');
    if (!rawDesc) continue;

    const date = parseFrenchDate(rawDate);

    // Determine debit/credit from amounts
    let debit  = 0;
    let credit = 0;

    if (amountTokens.length === 1) {
      const amt = parseMoroccanAmount(amountTokens[0]);
      const isIncome = /RECU|REÇU|CREDIT|REMBOURSEMENT|SALAIRE|DEPOT/i.test(rawDesc);
      if (isIncome) credit = amt; else debit = amt;
    } else if (amountTokens.length === 2) {
      const a = parseMoroccanAmount(amountTokens[0]);
      const b = parseMoroccanAmount(amountTokens[1]);
      // Balance is typically much larger than the transaction amount
      if (b > a * 2) {
        const isIncome = /RECU|REÇU|CREDIT|REMBOURSEMENT|SALAIRE|DEPOT/i.test(rawDesc);
        if (isIncome) credit = a; else debit = a;
      } else {
        debit  = a;
        credit = b;
      }
    } else {
      // 3+ amounts: [debit, credit, balance]
      debit  = parseMoroccanAmount(amountTokens[0]);
      credit = parseMoroccanAmount(amountTokens[1]);
    }

    if (debit === 0 && credit === 0) continue;

    const isCredit = credit > 0 && credit >= debit;
    const amount   = isCredit ? credit : debit;

    const { type, category, employee_name } = classify(rawDesc, amount, isCredit);

    transactions.push({
      date,
      description:     rawDesc,
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

export async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  // pdf-parse v2 exports a PDFParse class (not a function like v1)
  const { PDFParse } = await import('pdf-parse');

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();

  return extractTransactionsFromText(result.text);
}

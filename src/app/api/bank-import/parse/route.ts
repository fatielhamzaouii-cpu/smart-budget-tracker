import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { parsePDF } from '@/lib/parsers/pdf-parser';
import { parseCSV } from '@/lib/parsers/csv-parser';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name   = file.name.toLowerCase();

  try {
    let transactions;
    if (name.endsWith('.pdf')) {
      transactions = await parsePDF(buffer);
    } else if (name.endsWith('.csv') || name.endsWith('.txt')) {
      transactions = parseCSV(buffer.toString('utf-8'));
    } else {
      return NextResponse.json({ error: 'Unsupported file type. Upload PDF or CSV.' }, { status: 400 });
    }

    if (!transactions.length) {
      return NextResponse.json(
        { error: 'No transactions found. The file may be empty, scanned/image-only, or not an Attijariwafa Bank statement.' },
        { status: 422 },
      );
    }

    return NextResponse.json({ transactions, count: transactions.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[bank-import/parse] error:', message);
    return NextResponse.json({ error: `Parse failed: ${message}` }, { status: 500 });
  }
}

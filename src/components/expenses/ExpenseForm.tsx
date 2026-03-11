'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase';
import { Category, Expense } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseFormProps {
  categories: Category[];
  expense?: Expense | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ExpenseForm({ categories, expense, onSave, onCancel }: ExpenseFormProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    amount: expense?.amount?.toString() || '',
    category_id: expense?.category_id || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    notes: expense?.notes || '',
    receipt_url: expense?.receipt_url || '',
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${uuidv4()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(fileName, file);

    if (!error) {
      const { data } = supabase.storage.from('receipts').getPublicUrl(fileName);
      setForm(prev => ({ ...prev, receipt_url: data.publicUrl }));
    }
    setUploading(false);
  }, [supabase]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      user_id: user.id,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      date: form.date,
      notes: form.notes || null,
      receipt_url: form.receipt_url || null,
    };

    if (expense) {
      await supabase.from('expenses').update(payload).eq('id', expense.id);
    } else {
      await supabase.from('expenses').insert(payload);
    }

    setLoading(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Amount (MAD) *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
        <select
          value={form.category_id}
          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
        >
          <option value="">Select category</option>
          {categories.filter(c => c.type === 'expense').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
          rows={3}
          placeholder="What was this expense for?"
        />
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Receipt / Invoice</label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-purple-300'
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-slate-500">Uploading...</p>
          ) : form.receipt_url ? (
            <div>
              <p className="text-sm text-emerald-600 font-medium">Receipt uploaded</p>
              <p className="text-xs text-slate-400 mt-1">Drop a new file to replace</p>
            </div>
          ) : (
            <div>
              <svg className="mx-auto h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-slate-500 mt-2">Drag & drop or click to upload</p>
              <p className="text-xs text-slate-400">PNG, JPG, PDF up to 5MB</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
        >
          {loading ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

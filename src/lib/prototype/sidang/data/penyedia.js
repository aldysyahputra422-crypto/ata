/* AI providers for "Sambungkan AI". The first entry is the recommended local partner slot (example data).
   hargaPer1kToken: rough blended rupiah per 1,000 tokens for a mid-size model; used only for estimates. */
export const PENYEDIA = [
  { id: 'mitra-lokal', nama: 'Nusa AI Hub', mitra: true, catatan: 'Mitra lokal (DATA DEMO). Harga rupiah, satu key untuk banyak model.', bayar: ['QRIS', 'GoPay', 'OVO', 'Transfer bank'], hargaPer1kToken: 90, butuhBaseUrl: false },
  { id: 'openai', nama: 'OpenAI', mitra: false, catatan: 'Bayar pakai kartu kredit, tagihan dalam dolar.', bayar: ['Kartu kredit'], hargaPer1kToken: 120, butuhBaseUrl: false },
  { id: 'anthropic', nama: 'Anthropic (Claude)', mitra: false, catatan: 'Bayar pakai kartu kredit, tagihan dalam dolar.', bayar: ['Kartu kredit'], hargaPer1kToken: 150, butuhBaseUrl: false },
  { id: 'google', nama: 'Google Gemini', mitra: false, catatan: 'Ada kuota gratis harian yang kecil.', bayar: ['Kartu kredit'], hargaPer1kToken: 60, butuhBaseUrl: false },
  { id: 'openrouter', nama: 'OpenRouter', mitra: false, catatan: 'Satu key untuk banyak model, saldo dalam dolar.', bayar: ['Kartu kredit', 'Kripto'], hargaPer1kToken: 100, butuhBaseUrl: false },
  { id: 'custom', nama: 'Penyedia lain (OpenAI-compatible)', mitra: false, catatan: 'Isi alamat API dan key-nya sendiri.', bayar: [], hargaPer1kToken: 100, butuhBaseUrl: true }
];

/* Markdown kecil & aman untuk jawaban AI. Semua teks di-escape DULU, baru diberi format,
   jadi HTML dari model tidak pernah dijalankan. Mendukung: blok kode ```, `kode`, **tebal**, *miring*,
   judul #–###, daftar - / 1., tautan [teks](https://…), paragraf & baris baru. Murni. */

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sebaris(t) {
  return t
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>')
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

export function renderMarkdown(sumber) {
  const baris = esc(String(sumber ?? '').replace(/\r\n?/g, '\n')).split('\n');
  const out = [];
  let i = 0;
  const paragraf = [];
  const tutupParagraf = () => { if (paragraf.length) { out.push(`<p>${sebaris(paragraf.join('<br>'))}</p>`); paragraf.length = 0; } };
  while (i < baris.length) {
    const b = baris[i];
    const pagar = b.match(/^```\s*([\w+-]*)\s*$/);
    if (pagar) {
      tutupParagraf();
      const isi = [];
      i += 1;
      while (i < baris.length && !/^```\s*$/.test(baris[i])) { isi.push(baris[i]); i += 1; }
      i += 1; /* lewati pagar penutup (atau akhir teks saat masih mengalir) */
      out.push(`<pre class="md-kode"${pagar[1] ? ` data-bahasa="${pagar[1]}"` : ''}><code>${isi.join('\n')}</code></pre>`);
      continue;
    }
    const judul = b.match(/^(#{1,3})\s+(.+)$/);
    if (judul) { tutupParagraf(); out.push(`<p class="md-judul md-judul--${judul[1].length}">${sebaris(judul[2])}</p>`); i += 1; continue; }
    const butir = b.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.+)$/);
    if (butir) {
      tutupParagraf();
      const urut = !!butir[1], tag = urut ? 'ol' : 'ul', isi = [];
      while (i < baris.length) {
        const m = baris[i].match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.+)$/);
        if (!m || !!m[1] !== urut) break;
        isi.push(`<li>${sebaris(m[2])}</li>`);
        i += 1;
      }
      out.push(`<${tag}>${isi.join('')}</${tag}>`);
      continue;
    }
    if (!b.trim()) { tutupParagraf(); i += 1; continue; }
    paragraf.push(b);
    i += 1;
  }
  tutupParagraf();
  return out.join('');
}

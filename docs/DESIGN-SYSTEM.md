# Ata Design System — "Airy Glass"

| | |
|---|---|
| **Versi** | 1.0 · 11 November 2026 |
| **Berlaku untuk** | Ata (PWA mobile-first) — melengkapi PRD-Ata.md |
| **Prioritas** | Dokumen ini **menggantikan** PRD Bagian 9.3–9.6 (token, resep kaca, lapisan, gerak). Bagian 9.1, 9.2, 9.7, 9.8 tetap berlaku |
| **Tingkat efek** | **Bertingkat:** HP/layar sentuh = **Minim** (simpel, hemat baterai); desktop (layar ≥ 1024 px + mouse) = **Penuh / "power full"** (tilt 3D, parallax pointer, refraksi kaca, latar mesh bergerak). Lihat 6.1 dan 6.9 |
| **Dibaca oleh** | Claude Code (implementasi) dan Product Owner (review visual) |
| **Referensi visual** | Simpan 4 gambar referensi di `docs/references/` sebagai `ref-1-desk-cards.gif`, `ref-2-frost-folders.jpg`, `ref-3-gradient-card.jpg`, `ref-4-tactile-switch.jpg`. **Claude Code wajib membuka gambar itu dan mencocokkan hasil secara visual** |

## Daftar Isi

1. [Keputusan arah](#1-keputusan-arah)
2. [Bedah 4 referensi dan cara kita meningkatkannya](#2-bedah-4-referensi-dan-cara-kita-meningkatkannya)
3. [Token](#3-token)
4. [Material kaca dan mode performa](#4-material-kaca-dan-mode-performa)
5. [Layout responsif (mobile dan desktop)](#5-layout-responsif-mobile-dan-desktop)
6. [Komponen signature](#6-komponen-signature)
7. [Komponen dasar](#7-komponen-dasar)
8. [Gerak](#8-gerak)
9. [Aksesibilitas](#9-aksesibilitas)
10. [Aset yang dibutuhkan](#10-aset-yang-dibutuhkan)
11. [Implementasi](#11-implementasi)
12. [Prioritas build](#12-prioritas-build)
13. [Aturan boleh dan tidak boleh](#13-aturan-boleh-dan-tidak-boleh)

---

## 1. Keputusan arah

**Perubahan penting dari PRD:** keempat referensi semuanya **terang, berkabut, dan lapang**. Palet gelap pekat di PRD 9.3 tidak cocok dengan rasa itu. Maka:

- **Terang adalah tema utama** (*light-first*). Gelap tetap ada sebagai varian, bukan bawaan.
- Warna dipakai **hemat**, hanya pada "permata" (*gems*): stiker, chip, knob, tombol utama, cincin progres. Sisanya netral.
- Bahan kaca dibagi menjadi **tiga material** (tipis, beku, permata), bukan satu `.glass` untuk semua.
- Rasa "taktil": objek terlihat seperti benda yang bisa disentuh (knob, stiker bertepi putih, folder), bukan sekadar kotak.
- **Efek bertingkat menurut perangkat:** **HP = Minim** (bayangan, tepi putih, blur; tanpa parallax/tilt). **Desktop web = Penuh**: kedalaman nyata lewat tilt 3D, parallax mengikuti kursor, sorot cahaya (specular), refraksi kaca di Chromium, dan latar mesh yang bergerak pelan. Efek penuh dijaga oleh *governor* performa dan hormat pada preferensi aksesibilitas (6.9).

**DNA bersama keempat referensi** (jadi aturan keputusan desain):

1. Latar pastel berkabut, bukan putih datar dan bukan gelap.
2. Radius besar (20–36 px) dan bayangan berlapis yang lembut.
3. Tipografi kontras: judul tebal dan rapat, teks pendukung ringan dan kecil.
4. Ikon garis tipis, hitam/gelap.
5. Satu objek "bintang" per layar yang punya kedalaman (kartu poster, folder, knob).
6. Banyak ruang kosong. Jika ragu, hapus elemen.

---

## 2. Bedah 4 referensi dan cara kita meningkatkannya

| Ref | Yang diambil | Dipakai di Ata untuk | **Peningkatan khas Ata** |
|---|---|---|---|
| **1. Kartu pastel di atas "meja"** (kartu potret putih dengan bayangan jatuh berwarna oranye mengikuti isi gambar, avatar kecil di sudut, tipografi geometris tipis, latar berkabut, objek 3D meja + tanaman) | Kartu potret berderet horizontal; bayangan **berwarna mengikuti isi**; latar halo pastel; adegan "meja belajar" | **Karusel Radar**: tiap lomba = kartu poster rasio 4:5. Header **Hari Ini** = strip adegan meja belajar dengan maskot Ata | (a) **Bayangan bertinta** dari warna dominan poster; (b) **tanaman di meja** berganti tahap (1–4) sesuai konsistensi mingguan sebagai metafora progres, ilustrasi **datar** tanpa animasi tumbuh; (c) *(P2)* halo latar sedikit hangat saat Radar menemukan lomba, sejuk saat kosong |
| **2. Folder kaca dengan stiker** (folder buram, foto menyembul di belakang, stiker bertepi putih termasuk gaya prangko, pil jumlah "83 photos") | Folder beku, foto menyembul, stiker die-cut, pil jumlah | **Slot** (maks 3), **Karya**, **Tersimpan**, **Racikan** disajikan sebagai folder; poster/karya menyembul; stiker kategori + stempel deadline | (a) Slot kosong = folder garis putus "Slot kosong"; (b) **stempel prangko** menampilkan sisa hari ("H-12"); (c) jumlah foto menyembul = jumlah tugas selesai pekan ini (maks 3) |
| **3. Kartu gradien biru dengan jendela kaca + chip kursor berwarna** (sudut biru pekat memudar ke putih, jendela beku, chip pastel mengilap dengan panah penunjuk, judul tebal rapat, bercak warna kabur) | Hero onboarding dan landing; **GemChip** pastel dengan tepi putih; judul rapat; bercak warna | Layar sambutan, keadaan kosong besar, kartu laporan. **GemChip** untuk kategori dan status | **Saran mentor tampil sebagai chip kursor** yang menempel pada tugas ("Kak Dimas" dengan panah) — meminjam bahasa visual kolaborasi; kehadiran mentor terasa hidup tanpa dasbor |
| **4. Sakelar pil dengan knob taktil** (jalur putih lembut, knob bulat bertepi ganda yang berpindah, ikon garis tipis) | **TactileSegmented** dan **tab bar** | Segmen Tanya Ata (Chat · Resep · Ingatan), pilihan Efek Kaca (Penuh · Ringan · Mati), tema, filter Radar. **Tab bar utama memakai knob yang sama** supaya seluruh app punya satu "tanda tangan" | Knob bergerak dengan pegas dan getar halus (Android); area sentuh penuh pada tiap sel; tab bar memakai **ikon + label** (ikon tipis saja tidak cukup untuk aksesibilitas); di desktop menjadi rail vertikal |

---

## 3. Token

### 3.1 Warna (terang = bawaan)

```css
/* src/styles/tokens.css */
:root,
[data-theme="light"] {
  /* Mist: netral dengan sedikit ungu */
  --mist-0:   #FFFFFF;
  --mist-50:  #F7F6FB;
  --mist-100: #EFEEF6;
  --mist-200: #E2E1EC;
  --mist-300: #CDCCDB;
  --mist-500: #8B8CA3;  /* dekoratif/disabled saja, BUKAN untuk teks */
  --mist-600: #5B5F77;  /* teks sekunder (±5,7:1 di atas --bg) */
  --mist-800: #26274A;
  --mist-900: #14142B;

  --bg:             var(--mist-50);
  --surface:        #FFFFFF;
  --surface-sunken: var(--mist-100);
  --text:           var(--mist-900);
  --text-muted:     var(--mist-600);
  --border:         rgba(20, 20, 43, 0.10);
  --border-strong:  rgba(20, 20, 43, 0.18);

  /* Merek */
  --primary:        #5B3DF5;  /* Ambis Violet */
  --primary-hover:  #4B2DE0;
  --primary-ink:    #FFFFFF;  /* teks di atas primary (±6:1) */
  --primary-soft:   #ECE8FF;
  --hero-a:         #8B6CFF;
  --hero-b:         #2F6BFF;
  --spark:          #C6FF3D;  /* HANYA sebagai isian; jangan jadi warna teks di tema terang */
  --spark-ink:      #1B2300;

  /* Semantik */
  --success: #059669;  --success-soft: #D8F5E8;
  --warn:    #B45309;  --warn-soft:    #FFEBC7;
  --danger:  #BE123C;  --danger-soft:  #FFDDE5;
  --info:    #1D5FD6;  --info-soft:    #DCEBFF;

  /* Halo latar */
  --halo-1: rgba(139, 108, 255, 0.18);
  --halo-2: rgba(77, 163, 255, 0.18);
  --halo-3: rgba(255, 184, 107, 0.20);
}

[data-theme="dark"] {
  --bg:             #0D0D1F;
  --surface:        #17172E;
  --surface-sunken: #11112A;
  --text:           #F4F4FF;
  --text-muted:     #A9ABC8;
  --border:         rgba(255, 255, 255, 0.10);
  --border-strong:  rgba(255, 255, 255, 0.20);

  --primary:        #8B6CFF;
  --primary-hover:  #9F85FF;
  --primary-ink:    #0D0D1F;
  --primary-soft:   rgba(139, 108, 255, 0.18);
  --spark-ink:      #1B2300;

  --success-soft: rgba(52, 211, 153, 0.16);
  --warn-soft:    rgba(251, 191, 36, 0.16);
  --danger-soft:  rgba(251, 113, 133, 0.16);
  --info-soft:    rgba(96, 165, 250, 0.16);
  --success: #34D399; --warn: #FBBF24; --danger: #FB7185; --info: #60A5FA;

  --halo-1: rgba(139, 108, 255, 0.28);
  --halo-2: rgba(47, 107, 255, 0.22);
  --halo-3: rgba(255, 140, 70, 0.10);
}
```

**Tema otomatis:** `data-theme` diatur dari preferensi pengguna (Terang · Gelap · Otomatis); Otomatis mengikuti `prefers-color-scheme`. Simpan di `localStorage` dan terapkan **sebelum render** (skrip kecil di `<head>`) agar tidak berkedip.

### 3.2 Permata (*gems*) — warna aksen berlapis

Dipakai untuk GemChip, stiker, dan penanda kategori. Teks `ink` sudah dihitung ≥ 4,5:1 terhadap warna `bot` (hitungan kasar; **ukur ulang dengan alat kontras saat implementasi**).

| Nama | top | bot | ink | Dipakai untuk |
|---|---|---|---|---|
| `mint` | `#D9FBC9` | `#B4F08F` | `#2F6B12` | Kategori bisnis |
| `lavender` | `#E4DBFF` | `#C4B0FF` | `#4A2FB8` | Merek, kategori PKM/karya tulis, chip mentor |
| `apricot` | `#FFE8C2` | `#FFCB85` | `#8A4A00` | Kategori poster/desain/foto, stempel sisa hari, chip mentor |
| `sky` | `#D6ECFF` | `#A7D3FF` | `#0F4C9A` | Kategori olimpiade/hackathon, chip mentor |
| `rose` | `#FFDCE5` | `#FFB3C6` | `#9B1B45` | Kategori kreatif/video, chip mentor |
| `lemon` | `#FFF6BF` | `#FFE87A` | `#6B5600` | Kategori pidato/lainnya, sorotan "baru" |

```css
:root {
  --gem-mint-top:#D9FBC9;     --gem-mint-bot:#B4F08F;     --gem-mint-ink:#2F6B12;
  --gem-lavender-top:#E4DBFF; --gem-lavender-bot:#C4B0FF; --gem-lavender-ink:#4A2FB8;
  --gem-apricot-top:#FFE8C2;  --gem-apricot-bot:#FFCB85;  --gem-apricot-ink:#8A4A00;
  --gem-sky-top:#D6ECFF;      --gem-sky-bot:#A7D3FF;      --gem-sky-ink:#0F4C9A;
  --gem-rose-top:#FFDCE5;     --gem-rose-bot:#FFB3C6;     --gem-rose-ink:#9B1B45;
  --gem-lemon-top:#FFF6BF;    --gem-lemon-bot:#FFE87A;    --gem-lemon-ink:#6B5600;
}
```

Di tema gelap, permata **tidak berubah** (tetap pastel terang di atas permukaan gelap), sehingga terlihat seperti batu berkilau.

**Aturan:** maksimal **dua tone permata** dalam satu kartu; permata tidak pernah menjadi latar teks panjang. **Permata mewakili kategori (dan identitas mentor), bukan status** — status memakai warna semantik datar (Bagian 6.5).

### 3.3 Tipografi

| Peran | Font | Bobot | Catatan |
|---|---|---|---|
| Judul dan angka | **Plus Jakarta Sans** | 700–800 | `letter-spacing: -0.03em` (rapat, seperti judul ref 3) |
| Isi | **Inter** | 400–500 | Minimum bobot 400 untuk teks isi (jangan 300 di atas pastel) |
| Label kecil | Inter | 600 | Huruf kapital opsional, `letter-spacing: 0.04em` |

Muat lewat `next/font` (subset `latin`, `display: swap`). Angka progres/tanggal: `font-variant-numeric: tabular-nums`.

| Token | Ukuran / tinggi baris | Pakai untuk |
|---|---|---|
| `display` | 40 / 44 | Hero, angka besar laporan |
| `h1` | 32 / 36 | Judul layar |
| `h2` | 24 / 30 | Judul seksi |
| `h3` | 20 / 26 | Judul kartu |
| `body` | 16 / 24 | Isi |
| `small` | 14 / 20 | Pendukung |
| `caption` | 12 / 16 | Label, metadata (jangan untuk informasi penting) |

### 3.4 Spasi, radius, bayangan

| Token | Nilai |
|---|---|
| Spasi (kelipatan 4) | `4, 8, 12, 16, 20, 24, 32, 40, 56` |
| Padding halaman | 20 px (kiri/kanan) |
| Radius | `chip 999`, `button 16`, `input 14`, `card 24`, `folder 22`, `sheet 28 28 0 0`, `hero 36` |

```css
:root {
  --shadow-1: 0 1px 2px rgba(20,20,43,.06), 0 2px 8px rgba(20,20,43,.05);
  --shadow-2: 0 2px 4px rgba(20,20,43,.05), 0 12px 28px -8px rgba(20,20,43,.14);
  --shadow-3: 0 4px 8px rgba(20,20,43,.05), 0 28px 48px -16px rgba(20,20,43,.22);
  /* bayangan bertinta: --tint diisi warna dominan poster */
  --shadow-tint: 0 28px 44px -18px color-mix(in srgb, var(--tint, #8B8CA3) 55%, transparent);
}
```

**Bayangan bertinta (peningkatan dari ref 1):** kolom `competitions.tint_hex` diisi saat ekstraksi (mis. `sharp(...).stats().dominant`), lalu kartu poster memakai `style="--tint: #E8663A"`. Bila `tint_hex` kosong, jatuh ke abu netral.

### 3.5 Latar berkabut ("canvas")

```css
body { background: var(--bg); color: var(--text); }

/* lapisan halo tetap di belakang seluruh app (jangan pakai background-attachment: fixed, buruk di iOS) */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(60rem 28rem at 8% -8%,   var(--halo-1), transparent 70%),
    radial-gradient(44rem 26rem at 100% 6%,  var(--halo-2), transparent 70%),
    radial-gradient(40rem 24rem at 50% 108%, var(--halo-3), transparent 70%);
}

/* suasana halo (peningkatan): Radar menemukan lomba = hangat, kosong = sejuk */
[data-mood="found"] body::before { filter: hue-rotate(0deg) saturate(1.15); }
[data-mood="empty"] body::before { filter: hue-rotate(-18deg) saturate(.9); }
```

---

## 4. Material kaca dan mode performa

### 4.1 Tiga material

| Material | Karakter | Dipakai untuk |
|---|---|---|
| `glass-thin` | Tembus pandang tipis, tepi putih halus | Tab bar, header melayang, toast |
| `glass-frost` | Buram beku seperti folder di ref 2 | Folder, sheet, jendela hero, input beku |
| `gem` | Pastel mengilap, tepi putih tebal, tanpa blur | Chip, stiker, tombol utama, knob |

```css
:root {
  --blur-m: 16px;   /* thin */
  --blur-l: 22px;   /* frost */
  --glass-edge: rgba(255,255,255,.75);
  --glass-hi:   rgba(255,255,255,.90);   /* highlight tepi atas */
  --glass-thin-bg: color-mix(in srgb, var(--surface) 62%, transparent);
  --glass-frost-top: rgba(255,255,255,.74);
  --glass-frost-bot: rgba(255,255,255,.46);
}
[data-theme="dark"] {
  --glass-edge: rgba(255,255,255,.16);
  --glass-hi:   rgba(255,255,255,.22);
  --glass-thin-bg: color-mix(in srgb, var(--surface) 70%, transparent);
  --glass-frost-top: rgba(255,255,255,.12);
  --glass-frost-bot: rgba(255,255,255,.05);
}

.glass-thin {
  background: var(--glass-thin-bg);
  -webkit-backdrop-filter: blur(var(--blur-m)) saturate(150%);
  backdrop-filter: blur(var(--blur-m)) saturate(150%);
  border: 1px solid var(--glass-edge);
  box-shadow: var(--shadow-1), inset 0 1px 0 var(--glass-hi);
}

.glass-frost {
  background: linear-gradient(180deg, var(--glass-frost-top), var(--glass-frost-bot));
  -webkit-backdrop-filter: blur(var(--blur-l)) saturate(130%);
  backdrop-filter: blur(var(--blur-l)) saturate(130%);
  border: 1px solid var(--glass-edge);
  box-shadow: var(--shadow-2), inset 0 1px 0 var(--glass-hi), inset 0 -1px 0 rgba(20,20,43,.05);
}
```

### 4.2 Mode Efek Kaca (pengaturan pengguna) dan otomatis

| Mode | Perilaku | CSS |
|---|---|---|
| **Penuh** | Semua material aktif | bawaan |
| **Ringan** | Blur kecil, tanpa `saturate`, tanpa animasi halo | `[data-glass="light"] { --blur-m: 8px; --blur-l: 10px; }` |
| **Mati** | Tanpa blur sama sekali; permukaan solid + tepi tegas | lihat di bawah |

```css
[data-glass="light"] .glass-thin,
[data-glass="light"] .glass-frost {
  -webkit-backdrop-filter: blur(var(--blur-m));
  backdrop-filter: blur(var(--blur-m));
}

[data-glass="off"] .glass-thin,
[data-glass="off"] .glass-frost {
  background: var(--surface);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-color: var(--border-strong);
}

@media (prefers-reduced-transparency: reduce) {
  .glass-thin, .glass-frost {
    background: var(--surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass-thin, .glass-frost { background: var(--surface); }
}
```

**Dua pengaturan terpisah** (Profil → Pengaturan):

| Pengaturan | Pilihan | Mengatur |
|---|---|---|
| **Kaca** | Penuh · Ringan · Mati | Material blur/tembus pandang (`data-glass`) |
| **Efek** | Otomatis · Penuh · Minim | Gerak dan kedalaman: tilt, parallax, refraksi, mesh bergerak (`data-fx`) |

**Penentuan awal otomatis (sekali, saat pertama buka):** pada perangkat sentuh (`pointer: coarse`), jika `navigator.deviceMemory <= 4` atau `navigator.hardwareConcurrency <= 4` → **Kaca: Ringan**. Pada desktop → **Kaca: Penuh**. **Efek: Otomatis** berarti Penuh di desktop dan Minim di HP/tablet sentuh (aturan lengkap di 6.9). Pengguna selalu bisa mengubah; memilih Efek "Penuh" di HP menampilkan peringatan "lebih boros baterai".

### 4.3 Aturan performa

| Aturan | HP / sentuh (`minimal`) | Desktop (`rich`) |
|---|---|---|
| Elemen ber-blur terlihat bersamaan | ≤ 3 | ≤ 8 (dipantau governor) |
| `backdrop-filter` di elemen yang dianimasikan besar | Dilarang | Boleh untuk tilt/buka folder; transform dipasang pada elemen induk, jangan menganimasikan blur itu sendiri |
| Refraksi SVG (`feDisplacementMap`) | Tidak dipakai | Hanya Chromium, maks **2** elemen sekaligus (rail navigasi, dialog/jendela hero) |
| Latar | Statis (`body::before`) | Mesh bergerak (6.9), dijeda saat tab tersembunyi |
| Animasi | Hanya `transform` dan `opacity` | Sama; tidak ada animasi `width/height/top/left` |
| Karusel poster | Tanpa blur | Tanpa blur (tilt + kilau saja) |
| Target | 60 fps gulir di Android 4 GB RAM | 60 fps di laptop menengah (grafis terintegrasi); governor menurunkan efek jika di bawah ±30 fps |

---

## 5. Layout responsif (mobile dan desktop)

**Keputusan:** satu desain yang **berpikir mobile dulu** lalu melebar rapi ke desktop. Desktop **bukan** versi mobile yang diregangkan: navigasi berpindah ke rail samping, daftar berubah menjadi grid, dan panel konteks muncul di layar lebar.

### 5.1 Breakpoint

| Nama | Lebar | Perilaku |
|---|---|---|
| `base` | < 768 px | Satu kolom, **tab bar melayang** di bawah, sheet dari bawah |
| `md` | ≥ 768 px | Satu kolom terpusat (maks 640 px), tab bar tetap di bawah (lebar maks 420 px), sheet menjadi dialog di tengah |
| `lg` | ≥ 1024 px | **Rail navigasi kiri** menggantikan tab bar; konten maks 1120 px; daftar → grid; chat dua panel |
| `xl` | ≥ 1280 px | **Panel konteks kanan** (320 px) muncul di Hari Ini, Lomba, Tanya Ata |

### 5.2 Kerangka halaman

```css
.app-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}
.page {
  width: 100%;
  max-width: 1120px;
  margin-inline: auto;
  padding: 20px 20px calc(104px + env(safe-area-inset-bottom, 0px));
}

/* Tab bar melayang (mobile & tablet) */
.tabbar {
  position: fixed;
  left: 50%;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  transform: translateX(-50%);
  width: min(92vw, 420px);
  z-index: 40;
}
.navrail { display: none; }

@media (min-width: 768px) {
  .page { max-width: 640px; }
}

@media (min-width: 1024px) {
  .app-shell { grid-template-columns: 96px minmax(0, 1fr); }
  .tabbar { display: none; }
  .navrail {
    display: block;
    position: sticky;
    top: 0;
    height: 100dvh;
    padding: 20px 8px;
  }
  .page { max-width: 1120px; padding: 32px 40px 56px; }
}

@media (min-width: 1280px) {
  .app-shell[data-context="open"] { grid-template-columns: 96px minmax(0, 1fr) 320px; }
  .context-panel { display: block; position: sticky; top: 0; height: 100dvh; padding: 32px 24px; overflow-y: auto; }
}
.context-panel { display: none; }
```

### 5.3 Pola per layar

| Layar | Mobile (< 768) | Desktop (≥ 1024) |
|---|---|---|
| **Hari Ini** | Salam + strip meja → karusel poster Radar (geser) → tugas hari ini → pertanyaan L2 | Salam + strip meja lebar → **grid poster 3–4 kolom** → tugas hari ini di kiri, **panel konteks** (Slot + cincin + check-in) di kanan |
| **Lomba** | 3 folder bertumpuk vertikal; Peta Jalan sebagai garis waktu **vertikal** | 3 folder **sebaris**; Peta Jalan sebagai garis waktu **horizontal** dengan daftar tugas di bawahnya |
| **Tanya Ata** | Satu panel; segmen Chat · Resep · Ingatan di atas | **Dua panel:** daftar thread/ingatan (280 px) + chat (maks 720 px); Resep: daftar langkah kiri, isi langkah kanan |
| **Progres** | Cincin ditumpuk, heatmap bisa digeser | Cincin sebaris tiga, heatmap penuh 12 minggu tanpa geser |
| **Laporan** | Pengaturan → pratinjau → unduh (bertahap) | Pengaturan di kiri, **pratinjau A4** di kanan secara langsung |
| **Mentor Viewer** | Satu kolom | Dua kolom: ringkasan + saran |
| **Admin** | Tabel dapat digeser horizontal | Tabel penuh dengan filter |

### 5.4 Aturan input

- Efek hover **hanya** di `@media (hover: hover)`; tidak ada informasi yang hanya muncul saat hover.
- Target sentuh ≥ 44 px di perangkat sentuh; di `pointer: fine` kontrol sekunder boleh 36 px, tombol utama tetap 44 px.
- Semua fitur bisa dipakai dengan **keyboard** di desktop (urutan tab logis, panah pada segmented, `Esc` menutup dialog).
- Panjang baris teks bacaan maks 72 karakter (chat 720 px, laporan 680 px).
- Tipografi fluid untuk judul: `h1: clamp(28px, 2.4vw + 18px, 40px)`, `display: clamp(36px, 4vw + 18px, 56px)`.

---

## 6. Komponen signature

### 6.1 Kebijakan efek bertingkat

Aturannya sederhana: **HP simpel, desktop maksimal.** Satu basis kode, dua tingkat, ditentukan atribut `data-fx` di `<html>`.

| | **`minimal`** (HP, tablet sentuh) | **`rich`** (desktop web, "power full") |
|---|---|---|
| Kedalaman | Bayangan, tepi putih, blur (material Bagian 4) | Semua milik `minimal` **ditambah** tilt 3D, parallax pointer, sorot cahaya, refraksi, mesh bergerak |
| Parallax, tilt, perspective | **Dilarang** | **Wajib ada** pada komponen yang ditandai di 6.9 |
| Latar | Statis | Mesh bergerak pelan |
| Knob segmented | Cakram datar lembut | Bertepi ganda (bevel), magnet kecil mengikuti kursor |
| Transisi halaman | Fade sederhana | Transisi elemen bersama (View Transitions bila didukung) |
| Tanaman, hitung angka, cincin | Ganti langsung | Animasi tumbuh, count-up, cincin bercahaya |
| Prinsip | Hemat baterai dan data | Terasa seperti produk premium; tetap 60 fps |

**Penentuan otomatis (`resolveFx`)** = `rich` jika **semua** benar: lebar ≥ 1024 px, `(hover: hover) and (pointer: fine)`, dan pengguna tidak meminta `prefers-reduced-motion`. Selain itu `minimal`. Pengguna dapat memaksa Penuh/Minim di Pengaturan.

**Semua komponen wajib tampak benar dan lengkap di `minimal`**; `rich` hanya menambah, tidak pernah menjadi satu-satunya cara memahami UI. `prefers-reduced-motion` mematikan gerak (tilt, parallax, mesh, count-up) tetapi **tidak** mematikan material kaca; `prefers-reduced-transparency` mengganti kaca menjadi solid.

### 6.2 TactileSegmented dan Tab bar (ref 4)

Satu komponen untuk: segmen Tanya Ata, pilihan Efek Kaca/Tema, filter Radar, **tab bar mobile**, dan **rail navigasi desktop** (orientasi vertikal).

| Varian | Bentuk knob | Dipakai di |
|---|---|---|
| `icon` | Lingkaran (seperti ref 4) | Pilihan 2–4 ikon (tema, mode) |
| `text` | Pil | Segmen berlabel (Chat · Resep · Ingatan) |
| `tab` | Persegi membulat 22 px, ikon + label 11 px di bawahnya | Tab bar mobile (5 tab) |

```css
.seg {
  --seg-track: linear-gradient(180deg, #F6F6F8, #ECECEF);
  position: relative;
  display: grid;
  padding: 8px;
  border-radius: 999px;
  background: var(--seg-track);
  border: 1px solid var(--border);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 10px 24px -12px rgba(20,20,43,.22);
}
[data-theme="dark"] .seg { --seg-track: linear-gradient(180deg, #1D1D38, #15152C); box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 10px 24px -12px rgba(0,0,0,.5); }

.seg[data-orientation="horizontal"] { grid-auto-flow: column; grid-auto-columns: 1fr; height: 64px; }
.seg[data-orientation="vertical"]   { grid-auto-flow: row; grid-auto-rows: 64px; width: 80px; }
.seg[data-variant="tab"]            { height: 68px; border-radius: 28px; }

.seg__knob {
  position: absolute;
  pointer-events: none;
  display: grid;
  place-items: center;
  transition: transform var(--dur-3) var(--ease-spring);
}
.seg[data-orientation="horizontal"] .seg__knob {
  top: 8px; left: 8px;
  width: calc((100% - 16px) / var(--n));
  height: calc(100% - 16px);
  transform: translateX(calc(var(--i) * 100%));
}
.seg[data-orientation="vertical"] .seg__knob {
  top: 16px; left: 8px;
  width: calc(100% - 16px);
  height: 48px;
  transform: translateY(calc(var(--i) * 64px));
}

.seg__disc {
  height: 100%;
  background: linear-gradient(180deg, #FFFFFF, #E6E6EA);
  border: 1px solid rgba(20,20,43,.14);
  box-shadow: inset 0 1px 1px rgba(255,255,255,.95), 0 8px 16px -8px rgba(20,20,43,.30);
}
[data-theme="dark"] .seg__disc { background: linear-gradient(180deg, #3A3A5E, #2A2A4A); border-color: rgba(255,255,255,.14); box-shadow: inset 0 1px 1px rgba(255,255,255,.18), 0 8px 16px -8px rgba(0,0,0,.6); }

.seg[data-variant="icon"] .seg__disc { aspect-ratio: 1; border-radius: 50%; }
.seg[data-variant="text"] .seg__disc { width: calc(100% - 4px); border-radius: 999px; }
.seg[data-variant="tab"]  .seg__disc { width: calc(100% - 4px); border-radius: 22px; }

/* varian rich (opsional): knob bertepi ganda seperti ref 4 */
[data-fx="rich"] .seg[data-variant="icon"] .seg__disc { position: relative; }
[data-fx="rich"] .seg[data-variant="icon"] .seg__disc::after {
  content: ""; position: absolute; inset: 6px; border-radius: 50%;
  background: linear-gradient(180deg, #E8E8EC, #D6D6DB);
  box-shadow: inset 0 1px 2px rgba(20,20,43,.14);
}

.seg__item {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  background: none;
  border: 0;
  color: var(--text);
  font: 600 14px/1 var(--font-body);
  cursor: pointer;
  border-radius: 999px;
}
.seg[data-variant="tab"] .seg__label { font-size: 11px; font-weight: 600; }
.seg[data-variant="icon"] .seg__label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.seg__item svg { width: 24px; height: 24px; stroke-width: 1.5; }
.seg__item[aria-checked="false"] { color: var(--text-muted); }
```

```tsx
"use client";
import { useRef } from "react";

type Option<T extends string> = { value: T; label: string; icon?: React.ReactNode };

export function TactileSegmented<T extends string>({
  value, onChange, options, label,
  variant = "text", orientation = "horizontal",
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  label: string;
  variant?: "icon" | "text" | "tab";
  orientation?: "horizontal" | "vertical";
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function select(i: number) {
    const k = (i + options.length) % options.length;
    onChange(options[k].value);
    refs.current[k]?.focus();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
  }

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const fwd = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    if (e.key === fwd) { e.preventDefault(); select(i + 1); }
    else if (e.key === back) { e.preventDefault(); select(i - 1); }
    else if (e.key === "Home") { e.preventDefault(); select(0); }
    else if (e.key === "End") { e.preventDefault(); select(options.length - 1); }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="seg"
      data-variant={variant}
      data-orientation={orientation}
      style={{ "--n": options.length, "--i": index } as React.CSSProperties}
    >
      <span className="seg__knob" aria-hidden="true"><span className="seg__disc" /></span>
      {options.map((o, i) => (
        <button
          key={o.value}
          ref={(el) => { refs.current[i] = el; }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="seg__item"
          onClick={() => select(i)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.icon}
          <span className="seg__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
```

**Aturan:** maksimal 5 opsi (tab) / 4 opsi (lainnya). Tab bar membungkus `TactileSegmented variant="tab"` di dalam `.glass-thin`, memakai **navigasi rute** (bukan state), dan pada `lg` berubah menjadi `orientation="vertical" variant="icon"` di `.navrail` dengan label tooltip + label terlihat saat rail dilebarkan.

### 6.3 PosterCard dan Radar (ref 1)

Anatomi (atas → bawah): kategori (GemChip kecil) · judul tengah 16/20 bobot 500 · penyelenggara (caption, muted) · **gambar poster 4:5** penuh lebar · di atas gambar pojok kiri bawah: **avatar akun sumber** (28 px, tepi putih) dan **pil deadline**; pojok kanan atas: lencana `DATA DEMO` bila relevan.

```css
.poster-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: var(--shadow-1), var(--shadow-tint); /* --tint di-set inline dari competitions.tint_hex */
}
.poster-card__head { padding: 16px 16px 12px; text-align: center; }
.poster-card__title { font: 500 16px/20px var(--font-body); }
.poster-card__org   { margin-top: 2px; font: 400 12px/16px var(--font-body); color: var(--text-muted); }
.poster-card__media { position: relative; aspect-ratio: 4 / 5; background: var(--surface-sunken); }
.poster-card__media img { width: 100%; height: 100%; object-fit: cover; }
.poster-card__foot  { position: absolute; left: 12px; right: 12px; bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
.poster-card__avatar { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; box-shadow: var(--shadow-1); }

/* Karusel di mobile, grid di desktop */
.poster-rail {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding: 4px 20px 24px;
  margin-inline: -20px;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 20px;
  scrollbar-width: none;
}
.poster-rail::-webkit-scrollbar { display: none; }
.poster-rail > * { flex: 0 0 min(72vw, 280px); scroll-snap-align: start; }

@media (min-width: 1024px) {
  .poster-rail {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    overflow: visible;
    margin-inline: 0;
    padding: 4px 0 24px;
  }
  .poster-rail > * { flex: initial; }
}
```

Kartu **tidak** diberi blur dan tidak ada efek gulir. Di `minimal`, tidak ada skala/tilt. Di `rich`, kartu dibungkus `Tilt` (maks 8°) dengan kilau mengikuti kursor, bayangan bertinta menguat saat hover, dan overlay "Kenapa cocok" (2 alasan skor) muncul saat hover/fokus. Poster tanpa gambar (hanya teks) memakai latar gradien gem sesuai kategori dengan judul besar. Kartu "Hari ini belum ada yang cocok" memakai ukuran poster yang sama agar tata letak tidak melompat.

### 6.4 FolderCard (ref 2): Slot, Karya, Tersimpan, Racikan

Anatomi: **panel belakang** (abu muda bertab) → **hingga 3 thumbnail** menyembul (rotasi kecil −4°/0°/+4°, tepi putih 3 px) → **panel depan beku** (`glass-frost`, tab pada sisi kiri atas) → di panel depan: **stiker kategori** dan **stempel sisa hari** ("H-12") → di bawah folder: nama (16/20, 600) + **pil jumlah** (caption pada latar `--surface-sunken`).

```css
.folder { position: relative; width: 100%; aspect-ratio: 1.15; }
.folder__back {
  position: absolute; inset: 16% 0 0 0;
  border-radius: 22px;
  background: linear-gradient(180deg, var(--mist-200), var(--mist-300));
}
.folder__back::before {                /* tab */
  content: ""; position: absolute; top: -9%; left: 7%;
  width: 38%; height: 14%;
  border-radius: 14px 14px 0 0;
  background: inherit;
}
.folder__peek {
  position: absolute; bottom: 42%;
  width: 36%; aspect-ratio: 3 / 4;
  border: 3px solid #fff; border-radius: 10px;
  background: var(--surface-sunken) center / cover no-repeat;
  box-shadow: var(--shadow-1);
}
.folder__peek:nth-child(2) { left: 9%;  transform: rotate(-4deg); }
.folder__peek:nth-child(3) { left: 32%; transform: translateY(-6%); }
.folder__peek:nth-child(4) { right: 9%; transform: rotate(4deg); }
.folder__front {
  position: absolute; inset: 34% 0 0 0;
  border-radius: 22px;
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: 14px;
}
/* stiker die-cut: tepi putih lewat drop-shadow bertumpuk */
.sticker {
  width: 44px; height: 44px;
  filter:
    drop-shadow(1.5px 0 0 #fff) drop-shadow(-1.5px 0 0 #fff)
    drop-shadow(0 1.5px 0 #fff) drop-shadow(0 -1.5px 0 #fff)
    drop-shadow(0 4px 6px rgba(20,20,43,.18));
}
/* stempel prangko */
.stamp {
  padding: 6px 10px;
  font: 700 13px/1 var(--font-display);
  color: var(--gem-apricot-ink);
  background: var(--gem-apricot-top);
  border: 1.5px dashed rgba(138,74,0,.45);
  border-radius: 6px;
  transform: rotate(3deg);
}
.folder--empty .folder__back,
.folder--empty .folder__front { background: transparent; border: 2px dashed var(--border-strong); box-shadow: none; backdrop-filter: none; }
```

**Pada desktop**, tiga Slot ditampilkan sebaris (`grid-template-columns: repeat(3, 1fr)`); pada mobile ditumpuk vertikal dengan lebar penuh (maks 360 px). Posisi persis harus **dicocokkan secara visual dengan `ref-2`**; kode di atas titik awal, bukan hasil akhir.

### 6.5 GemChip (ref 3)

```css
.gem {
  --top: var(--gem-lavender-top);
  --bot: var(--gem-lavender-bot);
  --ink: var(--gem-lavender-ink);
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 14px;
  border-radius: 999px;
  font: 600 14px/1 var(--font-body);
  color: var(--ink);
  background: linear-gradient(180deg, var(--top), var(--bot));
  border: 1.5px solid rgba(255,255,255,.85);
  box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--bot) 80%, #000), inset 0 1px 0 rgba(255,255,255,.9);
}
.gem[data-tone="mint"]     { --top: var(--gem-mint-top);     --bot: var(--gem-mint-bot);     --ink: var(--gem-mint-ink); }
.gem[data-tone="apricot"]  { --top: var(--gem-apricot-top);  --bot: var(--gem-apricot-bot);  --ink: var(--gem-apricot-ink); }
.gem[data-tone="sky"]      { --top: var(--gem-sky-top);      --bot: var(--gem-sky-bot);      --ink: var(--gem-sky-ink); }
.gem[data-tone="rose"]     { --top: var(--gem-rose-top);     --bot: var(--gem-rose-bot);     --ink: var(--gem-rose-ink); }
.gem[data-tone="lemon"]    { --top: var(--gem-lemon-top);    --bot: var(--gem-lemon-bot);    --ink: var(--gem-lemon-ink); }
.gem--sm { height: 24px; padding: 0 10px; font-size: 12px; }
```

**Dua pemakaian:**
1. **Kategori** (pemetaan tetap di Bagian 9.2).
2. **Chip mentor (peningkatan dari ref 3):** saran mentor tampil sebagai `GemChip` dengan **panah penunjuk** kecil (SVG 16 px, warna `--bot`, tepi putih) yang menempel di pojok tugas yang disarankan. Nada warna dipilih **deterministik per mentor** (hash id → salah satu dari 5 tone), sehingga Kak Dimas selalu lavender dan Kak Rani selalu apricot. Ketuk chip membuka Kotak Saran. Pada desktop, chip bisa menampilkan komentar singkat saat fokus/hover.

**Status bukan permata.** Status (selesai, terlambat, perhatian) memakai warna semantik datar (`--success-soft`, `--warn-soft`, `--danger-soft`, `--info-soft`) + ikon + kata. Alasannya, permata mewakili *kategori*; mencampur keduanya membuat warna kehilangan arti.

### 6.6 HeroCard (ref 3)

Dipakai pada sambutan onboarding, landing, keadaan kosong besar, dan sampul laporan di layar.

```css
.hero-card {
  position: relative; isolation: isolate; overflow: hidden;
  border-radius: 36px;
  background: var(--surface);
  box-shadow: var(--shadow-3);
}
.hero-card::before {                       /* sudut gradien */
  content: ""; position: absolute; inset: 0; z-index: -2;
  background: radial-gradient(110% 80% at 0% 0%, var(--hero-a) 0%, var(--hero-b) 38%, transparent 72%);
}
.hero-card::after {                        /* memudar ke permukaan */
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: linear-gradient(180deg, transparent 52%, var(--surface) 86%);
}
.hero-card__window {
  margin: 28px 0 0 28px;
  border-radius: 22px 0 0 0;
  padding: 20px 20px 24px;
  background: rgba(255,255,255,.86);
  -webkit-backdrop-filter: blur(var(--blur-l));
  backdrop-filter: blur(var(--blur-l));
  box-shadow: -8px 12px 40px -14px rgba(31,91,240,.35);
}
.hero-card h1 { letter-spacing: -0.03em; font-family: var(--font-display); font-weight: 800; }

@media (min-width: 1024px) {
  .hero-card { display: grid; grid-template-columns: 1.1fr 1fr; align-items: center; }
  .hero-card::after { background: linear-gradient(90deg, transparent 52%, var(--surface) 90%); }
}
[data-glass="off"] .hero-card__window { background: var(--surface); -webkit-backdrop-filter: none; backdrop-filter: none; }
```

Bercak warna kabur di bawah jendela (ref 3) = satu `div` dengan `filter: blur(40px)`. Di `minimal` statis; di `rich` setiap lapisan (bercak, jendela, chip mentor/kategori) punya kedalaman **parallax pointer** (6.9).

### 6.7 ProgressRing

```tsx
import { useId } from "react";

export function ProgressRing({ value, label }: { value: number; label: string }) {
  const id = useId();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <figure className="ring" aria-label={`${label}: ${v} persen`}>
      <svg viewBox="0 0 100 100" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: "var(--primary)" }} />
            <stop offset="1" style={{ stopColor: "var(--hero-b)" }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--mist-200)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke={`url(#${id})`} strokeWidth="10"
          strokeLinecap="round" pathLength={100} strokeDasharray={`${v} 100`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <figcaption className="ring__value">{v}<small>%</small></figcaption>
    </figure>
  );
}
```

Angka di tengah memakai `font-display`, tabular. Saat 100%: isi lingkaran dalam dengan `--spark` + ikon centang (spark sebagai **isian**, teks tetap `--spark-ink`). Warna cincin tidak berubah menjadi merah saat tertinggal; status dikomunikasikan lewat teks ("Tertinggal 2 hari") dan ikon.

### 6.8 Strip Meja Belajar dan Tanaman (ref 1, versi simpel)

Header **Hari Ini**: ilustrasi **datar 2D** (tanpa 3D, tanpa parallax) berisi meja, maskot Ata, dan sebuah tanaman. Tinggi 120 px (mobile) / 160 px (desktop).

| Tahap tanaman | Syarat (Konsistensi 7 hari terakhir) |
|---|---|
| 1 Tunas | < 25% atau pengguna baru |
| 2 Daun muda | 25–49% |
| 3 Rimbun | 50–79% |
| 4 Berbunga | ≥ 80% |

**`minimal`:** mengganti SVG (fade 200 ms), tanpa animasi tumbuh. **`rich`:** daun tumbuh dengan animasi 800 ms (`scale` + `opacity`) saat tahap naik. Tanaman tidak pernah layu atau menampilkan rasa bersalah; tahap turun hanya berarti "belum seramai minggu lalu". Dengan `prefers-reduced-motion`, tanpa fade.

---

### 6.9 Efek Desktop Penuh (`data-fx="rich"`)

Semua efek di bawah **hanya aktif saat `data-fx="rich"`** dan hanya memakai `transform`/`opacity` (kecuali refraksi SVG). Tanpa JavaScript efek ini hilang dengan anggun menjadi `minimal`.

| # | Efek | Dipakai di | Prio |
|---|---|---|---|
| E1 | **Latar mesh bergerak** (3 bercak blur melayang pelan, 40–60 dtk per siklus, dijeda saat tab tersembunyi) | Seluruh app | P0 |
| E2 | **Tilt 3D + kilau** mengikuti kursor (maks 8°) | PosterCard, kartu Slot/Karya | P0 |
| E3 | **Sorot cahaya (specular)** pada kaca mengikuti kursor | Rail navigasi, sheet/dialog, folder, jendela hero | P0 |
| E4 | **Parallax pointer** berlapis (amplitudo ≤ 14 px) | HeroCard, strip meja belajar, halaman sambutan | P0 |
| E5 | **Refraksi kaca** (SVG displacement), hanya Chromium, maks 2 elemen | Rail navigasi, dialog | P1 |
| E6 | **Folder membuka** saat hover/fokus (panel depan berputar −14°, poster naik) | FolderCard | P0 |
| E7 | **Knob bertepi ganda + magnet** (≤ 3 px mengikuti kursor) | TactileSegmented, rail | P1 |
| E8 | **Transisi elemen bersama** antar rute (poster → detail) via View Transitions bila didukung | Radar → detail lomba | P1 |
| E9 | **Animasi masuk bertahap**, count-up angka, cincin bercahaya, tanaman tumbuh | Hari Ini, Progres | P1 |
| E10 | **Tekstur butir halus** (noise SVG ±3%) pada material beku agar terasa fisik | `glass-frost.grain` (sheet, dialog, jendela hero) | P1 |
| E11 | Animasi terkait gulir (`animation-timeline: scroll()`), progresif Chromium | Strip meja belajar, header | P2 |
| E12 | Palet perintah `Ctrl/Cmd + K` dan pintasan keyboard | Seluruh app | P2 |

#### Resolusi dan governor

```ts
// src/lib/fx/resolve-fx.ts
export type FxPref = "auto" | "rich" | "minimal";

export function resolveFx(pref: FxPref): "rich" | "minimal" {
  if (typeof window === "undefined") return "minimal";
  if (pref !== "auto") return pref;
  const q = (m: string) => window.matchMedia(m).matches;
  const capable = q("(min-width: 1024px)") && q("(hover: hover) and (pointer: fine)");
  const calm = q("(prefers-reduced-motion: reduce)");
  return capable && !calm ? "rich" : "minimal";
}

export function isChromium(): boolean {
  const n = navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } };
  return !!n.userAgentData?.brands.some((b) => b.brand === "Chromium");
}
```

```ts
// src/lib/fx/governor.ts: menurunkan efek otomatis bila patah-patah
export function startFxGovernor(onDegrade: () => void, durationMs = 10_000) {
  let last = performance.now();
  const t0 = last;
  let winStart = last, frames = 0, slow = 0, stopped = false;

  function tick(now: number) {
    if (stopped) return;
    const dt = now - last;
    last = now;
    if (dt < 1000) {            // abaikan jeda saat tab tersembunyi
      frames++;
      if (dt > 34) slow++;      // di bawah ±30 fps
    }
    if (now - winStart >= 2000) {
      if (frames > 20 && slow / frames > 0.25) { stopped = true; onDegrade(); return; }
      winStart = now; frames = 0; slow = 0;
    }
    if (now - t0 < durationMs) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
```

Saat `onDegrade`: set `data-fx="minimal"`, simpan `sessionStorage.fx = "minimal-auto"`, dan tampilkan toast "Efek diturunkan agar tetap mulus. Ubah di Pengaturan → Efek." Governor berjalan 10 detik pertama setiap sesi dan setelah jendela diubah ukurannya secara besar; **tidak** berjalan bila pengguna memilih Efek "Penuh" secara eksplisit (hormati pilihan, tampilkan peringatan saja).

#### E1 Latar mesh bergerak

```css
.mesh { display: none; }

[data-fx="rich"] body::before { display: none; }          /* ganti halo statis */
[data-fx="rich"] .mesh {
  display: block;
  position: fixed; inset: 0; z-index: -1;
  overflow: hidden; pointer-events: none;
}
[data-fx="rich"] .mesh i {
  position: absolute;
  width: 46vmax; height: 46vmax;
  border-radius: 50%;
  filter: blur(90px);
  opacity: .30;
  will-change: transform;
  animation: mesh-drift 46s ease-in-out infinite alternate;
}
[data-fx="rich"] .mesh i:nth-child(1) { top: -18vmax; left: -10vmax; background: #8B6CFF; }
[data-fx="rich"] .mesh i:nth-child(2) { top: -8vmax;  right: -14vmax; background: #4DA3FF; animation-duration: 58s; animation-delay: -12s; }
[data-fx="rich"] .mesh i:nth-child(3) { bottom: -22vmax; left: 22vw; background: #FFB86B; opacity: .24; animation-duration: 52s; animation-delay: -24s; }
[data-theme="dark"][data-fx="rich"] .mesh i { opacity: .38; }

@keyframes mesh-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(8vw, 6vh, 0) scale(1.14); }
}
html[data-page-hidden="true"] .mesh i { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) { [data-fx="rich"] .mesh i { animation: none; } }
```

`MeshBackground` merender `<div class="mesh" aria-hidden="true"><i></i><i></i><i></i></div>` sekali di layout akar; `FxProvider` mengatur `data-page-hidden` lewat `visibilitychange`.

#### E2 Tilt 3D dan kilau

```tsx
"use client";
import { useRef } from "react";

export function Tilt({ children, max = 8 }: { children: React.ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  function onMove(e: React.PointerEvent) {
    if (document.documentElement.dataset.fx !== "rich" || e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
      el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    });
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} className="tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="tilt__body">{children}</div>
    </div>
  );
}
```

```css
[data-fx="rich"] .tilt { perspective: 900px; }
[data-fx="rich"] .tilt__body {
  position: relative;
  border-radius: inherit;
  transform: rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform var(--dur-2) var(--ease-out);
  will-change: transform;
}
[data-fx="rich"] .tilt__body::after {          /* kilau */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.38), transparent 62%);
  opacity: 0; transition: opacity var(--dur-2) var(--ease-out);
}
@media (hover: hover) {
  [data-fx="rich"] .tilt:hover .tilt__body::after { opacity: 1; }
  [data-fx="rich"] .tilt:hover .poster-card {
    box-shadow: var(--shadow-2), 0 36px 56px -20px color-mix(in srgb, var(--tint, #8B8CA3) 70%, transparent);
  }
}
```

Jika pengguna memaksa Efek "Penuh" sementara `prefers-reduced-motion` aktif, tilt dikurangi menjadi maks 3°.

#### E3 Sorot cahaya (specular) pada kaca

`FxProvider` memasang **satu** pendengar `pointermove` di dokumen (di-*throttle* dengan `requestAnimationFrame`), mencari `closest("[data-specular]")`, lalu menulis `--mx/--my` (px relatif elemen) ke elemen itu.

```css
[data-fx="rich"] .glass-frost[data-specular] {
  background-image:
    radial-gradient(220px circle at var(--mx, -200px) var(--my, -200px), rgba(255,255,255,.55), transparent 62%),
    linear-gradient(180deg, var(--glass-frost-top), var(--glass-frost-bot));
}
[data-fx="rich"] .glass-thin[data-specular] {
  background-image:
    radial-gradient(180px circle at var(--mx, -200px) var(--my, -200px), rgba(255,255,255,.5), transparent 62%),
    linear-gradient(var(--glass-thin-bg), var(--glass-thin-bg));
}
```

#### E4 Parallax pointer berlapis

`FxProvider` menulis `--pxn` dan `--pyn` (−1…1, posisi kursor terhadap tengah viewport) pada `[data-parallax]` terdekat. Lapisan memberi kedalaman lewat `--d`:

```css
[data-fx="rich"] [data-parallax] .layer {
  --d: 1;
  transform: translate3d(calc(var(--pxn, 0) * var(--d) * 14px), calc(var(--pyn, 0) * var(--d) * 10px), 0);
  transition: transform var(--dur-3) var(--ease-out);
  will-change: transform;
}
[data-fx="rich"] [data-parallax] .layer[data-depth="back"]  { --d: -0.4; }   /* bercak warna */
[data-fx="rich"] [data-parallax] .layer[data-depth="mid"]   { --d: 0.5; }    /* jendela kaca */
[data-fx="rich"] [data-parallax] .layer[data-depth="front"] { --d: 1; }      /* chip, stiker, maskot */
```

Amplitudo kecil sengaja (≤ 14 px) agar tidak memicu mual; dimatikan oleh `prefers-reduced-motion`.

#### E5 Refraksi kaca (Chromium saja)

```html
<!-- RefractDefs.tsx: render sekali di layout akar -->
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <filter id="liquid-refract" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
  </filter>
</svg>
```

```css
html[data-refract="on"][data-fx="rich"] .glass-thin[data-refract],
html[data-refract="on"][data-fx="rich"] .glass-frost[data-refract] {
  -webkit-backdrop-filter: url(#liquid-refract) blur(14px) saturate(160%);
  backdrop-filter: url(#liquid-refract) blur(14px) saturate(160%);
}
```

`data-refract="on"` hanya dipasang bila `isChromium()` benar. Safari/Firefox tetap memakai blur biasa. **Maks 2 elemen** `data-refract` per halaman. Bila governor menurunkan efek, atribut dicabut. Perilaku ini perlu diuji langsung di Chrome/Edge sebelum dianggap selesai.

#### E6 Folder membuka dan E10 tekstur butir

```css
[data-fx="rich"] .folder { perspective: 900px; }
[data-fx="rich"] .folder__front { transform-origin: 50% 100%; transition: transform var(--dur-3) var(--ease-spring); }
[data-fx="rich"] .folder__peek  { transition: translate var(--dur-3) var(--ease-spring); }
@media (hover: hover) {
  [data-fx="rich"] .folder:hover .folder__front,
  [data-fx="rich"] .folder:focus-within .folder__front { transform: rotateX(-14deg); }
  [data-fx="rich"] .folder:hover .folder__peek,
  [data-fx="rich"] .folder:focus-within .folder__peek { translate: 0 -10%; }
}

/* butir halus pada material beku (SVG noise sebagai data URI, ±3%) */
[data-fx="rich"] .glass-frost.grain { position: relative; }
[data-fx="rich"] .glass-frost.grain::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  opacity: .03; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

Butir hanya dipasang lewat kelas `.grain` (pada sheet, dialog, jendela hero), **bukan** pada `.folder__front` yang sudah `position: absolute`.

#### E7 Knob rich (semua varian)

```css
[data-fx="rich"] .seg__disc {
  position: relative;
  border-width: 1.5px;
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,.95),
    inset 0 -3px 5px rgba(20,20,43,.08),
    0 10px 20px -8px rgba(20,20,43,.34),
    0 1px 0 rgba(255,255,255,.9);
}
[data-fx="rich"] .seg[data-variant="text"] .seg__disc::after,
[data-fx="rich"] .seg[data-variant="tab"]  .seg__disc::after {
  content: ""; position: absolute; inset: 4px; border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,0));
  pointer-events: none;
}
/* magnet: JS menulis --kx/--ky (−3…3 px) saat pointer di atas jalur */
[data-fx="rich"] .seg__knob > .seg__disc { translate: var(--kx, 0px) var(--ky, 0px); transition: translate var(--dur-2) var(--ease-out); }
```

#### E8 Transisi halaman

Gunakan `document.startViewTransition` (deteksi fitur) pada navigasi klien antar rute, dengan `view-transition-name` pada kartu poster/judul lomba. Bila tidak didukung, navigasi biasa. **Verifikasi dukungan Next.js 15** (flag eksperimental) saat implementasi; jangan memblokir rilis demo.

#### Pagar pengaman efek

- `rich` tidak boleh menurunkan keterbacaan: teks tidak pernah berada di atas bagian yang bergerak cepat; kontras diuji pada kondisi terburuk (kilau + mesh).
- Seluruh efek berhenti saat tab tersembunyi.
- Semua efek punya padanan statis di `minimal`; tidak ada informasi yang hanya muncul lewat efek.
- Uji 60 fps di laptop menengah (grafis terintegrasi) pada Hari Ini dengan 12 poster, 3 folder, dan rail navigasi.

---

## 7. Komponen dasar

| Komponen | Spesifikasi |
|---|---|
| **Button** | Tinggi 48 (md), 40 (sm); radius 16; `primary` = gradien violet tipis + `inset` highlight; `secondary` = `glass-frost`; `ghost` = tanpa latar; `danger` = `--danger`. Tekan: `translateY(1px) scale(.98)`. Memuat: spinner kecil, lebar tetap |
| **IconButton** | 44×44, radius 14, ikon 24 stroke 1.5, `aria-label` wajib |
| **Input / Textarea** | Tinggi 48, radius 14, latar `--surface-sunken`, tepi `--border`; fokus = cincin 2 px `--primary`; galat = tepi `--danger` + teks galat di bawah (ikon + kata) |
| **Select / Combobox** | Pakai shadcn; panel `glass-frost` pada desktop, **sheet** pada mobile |
| **Switch** | Lintasan `--surface-sunken`, knob putih bulat dengan bayangan lembut (selaras knob segmented) |
| **Card** | `--surface`, radius 24, `--shadow-1`; padding 20 (mobile) / 24 (desktop) |
| **TaskRow** | Tinggi min 56; kotak centang 24 px bulat; judul 16/22; estimasi menit caption; chip mentor di kanan bila ada saran; selesai = coret halus + `--text-muted` |
| **Sheet / Dialog** | Mobile (< 768): sheet dari bawah, radius atas 28, pegangan 36×4; ≥ 768: dialog tengah maks 520 px; panel samping 420 px untuk Kotak Saran di `lg`. `glass-frost`, latar redup `rgba(20,20,43,.32)` |
| **Toast** | `glass-thin`, di atas tab bar (mobile) / pojok kanan bawah (desktop), 4 detik, bisa ditutup |
| **Badge** | `DATA DEMO` = pil `--warn-soft` dengan ikon; `Sobat Ambis` = `GemChip lavender`; ConfidenceBadge = ikon + kata ("Yakin", "Cek poster asli") |
| **Tabs (nonsegmented)** | Garis bawah 2 px `--primary`, hanya untuk navigasi dalam halaman di desktop |
| **Tooltip** | Hanya desktop; tidak membawa informasi penting |
| **Skeleton** | Blok `--surface-sunken` dengan kilau lembut 1,4 dtk; berhenti dengan `prefers-reduced-motion` |
| **EmptyState** | Maskot Ata (pose sesuai situasi) 96–128 px + judul + 1 kalimat + 1 aksi; ukuran poster/kartu tetap agar tata letak tidak melompat |
| **DataTable (admin)** | shadcn table; baris 44 px; header sticky; filter di atas |
| **Banner Demo** | Garis tipis 28 px di atas, `--warn-soft`, teks 12 px "Versi Demo — data contoh" |

```css
.btn {
  height: 48px; padding: 0 20px;
  border-radius: 16px; border: 0;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font: 600 16px/1 var(--font-body);
  cursor: pointer;
  transition: transform var(--dur-1) var(--ease-out), box-shadow var(--dur-2) var(--ease-out);
}
.btn:active { transform: translateY(1px) scale(.98); }
.btn-primary {
  color: var(--primary-ink);
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 86%, #fff), var(--primary));
  box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--primary) 70%, transparent), inset 0 1px 0 rgba(255,255,255,.35);
}
@media (hover: hover) { .btn-primary:hover { background: var(--primary-hover); } }
.btn-secondary { color: var(--text); }  /* + class glass-frost */
.btn[disabled] { opacity: .5; cursor: not-allowed; box-shadow: none; }
```

---

## 8. Gerak

Prinsip: gerak **menjelaskan perubahan**; hiburan hanya di `rich`. Hanya `transform` dan `opacity` (kecuali refraksi SVG). **Di `minimal` (HP): tanpa parallax, tanpa animasi terkait gulir, tanpa loop dekoratif.** Di `rich` (desktop): efek E1–E12 di Bagian 6.9. Tabel di bawah berlaku untuk **kedua** tingkat.

```css
:root {
  --ease-out:    cubic-bezier(.22, 1, .36, 1);
  --ease-spring: cubic-bezier(.34, 1.3, .64, 1);   /* overshoot ringan */
  --dur-1: 120ms;   /* tekan, hover */
  --dur-2: 200ms;   /* fade, muncul */
  --dur-3: 320ms;   /* knob, sheet */
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```

| Peristiwa | Gerak | Durasi |
|---|---|---|
| Tekan tombol | `scale(.98)` + turun 1 px | 120 ms |
| Pindah segmen/tab | Knob bergeser dengan pegas | 320 ms |
| Buka sheet / dialog | Naik dari bawah (mobile) / fade + naik 8 px (desktop) | 320 / 200 ms |
| Cincin progres | Isi dari 0 sekali saat pertama muncul (`stroke-dasharray`) | 600 ms |
| Centang tugas | Kotak terisi + coret halus | 200 ms |
| Kartu muncul | Fade + naik 8 px, bertahap 40 ms antarkartu (maks 6) | 200 ms |
| Ganti tahap tanaman | Fade silang | 200 ms |
| Perayaan Slot selesai | Maskot pose "rayakan" fade-in + satu burst konfeti statis | 400 ms |
| Getar | `navigator.vibrate(8)` pada pindah segmen (Android; iOS tidak mendukung) | — |

---

## 9. Aksesibilitas

### 9.1 Aturan wajib

| Area | Persyaratan |
|---|---|
| Kontras | Teks normal ≥ 4,5:1, teks besar/ikon ≥ 3:1, **diukur di atas material kaca dan latar halo terburuk**. `--mist-500` dan `--spark` bukan warna teks |
| Fokus | Cincin terlihat di semua elemen interaktif: `outline: 2px solid var(--primary); outline-offset: 2px;` plus halo 5 px; tidak pernah dihapus |
| Target | ≥ 44 px (sentuh) |
| Status | Selalu **ikon + kata**, bukan warna saja |
| Ikon tipis | Ikon stroke 1.5 minimal 24 px; tab bar punya label teks; ikon tanpa label memakai `aria-label` |
| Keyboard | Segmented: panah/Home/End; dialog: `Esc`, fokus terkurung dan dikembalikan; urutan Tab logis |
| Pembaca layar | `role="radiogroup"` + `aria-checked` untuk segmented; cincin progres punya teks; grafik punya tabel alternatif |
| Gerak/transparansi | `prefers-reduced-motion`, `prefers-reduced-transparency`, dan mode Efek Kaca Mati dihormati |
| Zoom/teks | Ukuran dalam `rem`; tata letak utuh pada zoom 200% dan teks 150% |
| Warna paksa | `@media (forced-colors: active)`: semua tepi/fokus memakai `CanvasText`/`Highlight` |

```css
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--primary) 22%, transparent);
}
@media (forced-colors: active) {
  .glass-thin, .glass-frost, .gem, .poster-card, .folder__front { border: 1px solid CanvasText; }
  :focus-visible { outline-color: Highlight; box-shadow: none; }
}
```

### 9.2 Pemetaan kategori → stiker dan permata

| Kategori | Tone | Ikon stiker (Lucide, sementara) |
|---|---|---|
| `business_plan` | mint | `briefcase-business` |
| `pkm` | lavender | `flask-conical` |
| `kti_essay` | lavender | `file-text` |
| `olympiad` | sky | `atom` |
| `hackathon` | sky | `code-xml` |
| `poster` | apricot | `image` |
| `design` | apricot | `pen-tool` |
| `photo` | apricot | `camera` |
| `creative_writing` | rose | `feather` |
| `video` | rose | `clapperboard` |
| `speech` | lemon | `mic` |
| `other` | lemon | `sparkles` |

---

## 10. Aset yang dibutuhkan

| Aset | Jumlah | Sumber | Catatan |
|---|---|---|---|
| **Maskot Ata** | ≥ 4 pose: santai, mikir, rayakan, waspada (+ opsional "tidur" untuk Radar kosong) | **Sobat Ambis** (aset resmi) | PNG/SVG transparan; **jangan dibuat ulang oleh AI** |
| Stiker kategori | 12 (tabel 9.2) | Sementara: Claude Code membuat **glif Lucide di atas bentuk gem** + tepi putih die-cut. **Ganti dengan ilustrasi desainer** sebelum publik | Tandai `TODO(design)` |
| Template stempel | 1 (prangko bergerigi) | CSS (`.stamp`) | Variasi nada sesuai sisa hari |
| Strip meja + 4 tahap tanaman | 1 + 4 | Ilustrasi **datar** SVG (sementara sederhana) | Maskot duduk di meja |
| Halo latar | — | CSS (tanpa gambar) | Lihat 3.5 |
| Ikon | Lucide, `stroke-width: 1.5` | Pustaka | Atur global lewat `lucide-react` defaultProps/wrapper |
| Font | Plus Jakarta Sans, Inter | `next/font` | Subset `latin` |
| Ikon PWA | 192/512 + maskable | Dari logo Ata | Latar `--primary` |
| Bayangan poster (demo) | ±30 poster fiktif | Dibuat dari gradien + teks (SVG), **bukan** merek nyata | Berlabel DATA DEMO |

---

## 11. Implementasi

### 11.1 Struktur berkas

```text
src/styles/
  tokens.css        # 3.1–3.4 (warna, gem, bayangan, spasi) + gerak (Bagian 8)
  canvas.css        # 3.5
  glass.css         # Bagian 4
  components.css    # .btn, .seg, .gem, .poster-card, .folder, .hero-card, .ring, dst.
  layout.css        # Bagian 5
src/components/ds/
  TactileSegmented.tsx, TabBar.tsx, NavRail.tsx, PosterCard.tsx, PosterRail.tsx,
  FolderCard.tsx, GemChip.tsx, MentorChip.tsx, HeroCard.tsx, ProgressRing.tsx,
  DeskStrip.tsx, Sticker.tsx, Stamp.tsx, Sheet.tsx, EmptyState.tsx, Banner.tsx,
  Tilt.tsx, MeshBackground.tsx, RefractDefs.tsx, FxProvider.tsx
src/lib/fx/                # resolve-fx.ts, governor.ts, pointer.ts (specular + parallax)
src/app/(dev)/styleguide/page.tsx   # hanya DEMO_MODE atau admin
```

### 11.2 Atribut di `<html>`

| Atribut | Nilai | Sumber |
|---|---|---|
| `data-theme` | `light` · `dark` | Pengaturan (Terang/Gelap/Otomatis) |
| `data-glass` | `full` · `light` · `off` | Pengaturan + penentuan awal otomatis |
| `data-fx` | `rich` · `minimal` (hasil resolusi) | Pengaturan **Efek** (Otomatis/Penuh/Minim) + `resolveFx` (6.9) |
| `data-refract` | `on` | Dipasang bila Chromium dan `rich` (E5) |
| `data-page-hidden` | `true` | `visibilitychange`; menjeda mesh dan efek |
| `data-mood` | `found` · `empty` | Status Radar hari ini |

Terapkan nilai tersimpan **sebelum render** dengan skrip inline kecil di `<head>` agar tidak berkedip; sinkronkan ke profil di database setelah login.

### 11.3 Pemetaan ke shadcn/ui dan Tailwind

shadcn menghasilkan variabel sendiri saat `init`; **timpa**, jangan gandakan:

```css
:root {
  --background: var(--bg);
  --foreground: var(--text);
  --card: var(--surface);
  --card-foreground: var(--text);
  --popover: var(--surface);
  --popover-foreground: var(--text);
  --primary-foreground: var(--primary-ink);
  --secondary: var(--surface-sunken);
  --secondary-foreground: var(--text);
  --muted: var(--surface-sunken);
  --muted-foreground: var(--text-muted);
  --accent: var(--primary-soft);
  --accent-foreground: var(--primary);
  --destructive: var(--danger);
  --input: var(--border-strong);
  --ring: var(--primary);
  --radius: 1rem;
}
```

```css
/* Tailwind v4 */
@import "tailwindcss";
@theme inline {
  --color-background: var(--bg);
  --color-foreground: var(--text);
  --color-card: var(--surface);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-ink);
  --color-muted: var(--surface-sunken);
  --color-muted-foreground: var(--text-muted);
  --color-border: var(--border);
  --color-ring: var(--primary);
  --font-sans: var(--font-body);
  --font-display: var(--font-display);
  --radius-card: 24px;
  --radius-sheet: 28px;
}
```

Jika proyek memakai Tailwind v3, petakan nilai yang sama ke `theme.extend` di `tailwind.config`.

### 11.4 Halaman `/styleguide` (wajib, dipakai review visual)

Satu halaman yang menampilkan **semua** token dan komponen. Syarat penerimaan:

| ID | Kebutuhan | Prio |
|---|---|---|
| DS-01 | Menampilkan palet (Mist, merek, semantik, 6 gem), tipografi, bayangan, material kaca | P0 |
| DS-02 | Menampilkan setiap komponen di Bagian 6–7 dengan state: bawaan, hover, fokus, aktif, nonaktif, galat/kosong | P0 |
| DS-03 | **Pengalih** terang/gelap, Kaca Penuh/Ringan/Mati, **Efek Otomatis/Penuh/Minim**, dan lebar tampilan (390 / 768 / 1280) di bagian atas | P0 |
| DS-04 | Setiap komponen signature dibandingkan dengan gambar `docs/references/` di sebelahnya (kolom "Referensi") | P1 |
| DS-05 | Uji tangkapan layar Playwright untuk matriks: {terang, gelap} × {kaca penuh, mati} × {390 px `minimal`, 1280 px `rich`} pada `/styleguide` | P1 |
| DS-07 | Halaman memuat panel **FPS** (hanya `/styleguide`) dan tombol "Simulasikan beban" untuk menguji governor | P1 |
| DS-06 | Uji otomatis kontras (mis. axe) pada pasangan teks/latar di `/styleguide` | P1 |

---

## 12. Prioritas build

| Prioritas | Isi | Kapan (dari rencana 4 hari) |
|---|---|---|
| **P0** | Token, canvas, material kaca, pengaturan **Kaca** dan **Efek**; `resolveFx` + governor + `FxProvider`; kerangka responsif (tab bar mobile dan rail desktop); TactileSegmented (3 varian); Button, Input, Card, Sheet/Dialog, Toast; GemChip + pemetaan kategori; PosterCard + PosterRail; FolderCard (+ kosong); ProgressRing; EmptyState; Banner Demo; **efek desktop E1 (mesh), E2 (tilt), E3 (specular), E4 (parallax), E6 (folder membuka)**; `/styleguide` dasar | Hari 1–2 |
| **P1** | HeroCard; bayangan bertinta; strip meja + tanaman (tumbuh di `rich`); MentorChip; stempel; panel konteks desktop; pratinjau A4 sejajar; **E5 (refraksi), E7 (knob rich + magnet), E8 (transisi halaman), E9 (animasi masuk/count-up), E10 (butir)**; uji tangkapan layar; panel FPS | Hari 3–4 |
| **P2** | E11 (animasi terkait gulir), E12 (palet perintah + pintasan); getar; suasana halo (`data-mood`); ilustrasi stiker dari desainer | Setelah demo |

**Catatan jadwal:** efek desktop penuh menambah ± setengah hari. Jika waktu mepet, potong **E8/E9/E10** lebih dulu; **E1–E4 dan E6 tidak dipotong** karena itulah pembeda tampilan desktop.

---

## 13. Aturan boleh dan tidak boleh

| Boleh | Tidak boleh |
|---|---|
| Satu "objek bintang" per layar | Semua kartu bersaing tampil mencolok |
| Permata untuk **kategori**, semantik datar untuk **status** | Mencampur warna kategori dan status |
| Bayangan lembut berlapis | Bayangan hitam pekat atau neon |
| Judul tebal rapat + teks pendukung ringan | Teks bobot 300 di atas latar pastel |
| Ruang kosong generous | Memenuhi layar demi "terlihat kaya" |
| Kaca pada tab bar, sheet, folder | Kaca pada teks panjang, baris daftar, karusel poster |
| Maskot di keadaan kosong/perayaan | Maskot di setiap kartu |
| Ikon Lucide stroke 1.5 | Campuran gaya ikon |
| Animasi `transform`/`opacity` | Animasi `width/height/top/left` |
| **Desktop (`rich`): tilt 3D, parallax pointer, specular, refraksi, mesh bergerak** | Efek yang menurunkan keterbacaan atau membuat fps < ±50 di laptop menengah |
| **HP (`minimal`): bayangan, tepi putih, blur** | Parallax, tilt, perspective, latar bergerak di HP |
| Desktop: grid, rail, panel konteks | Merenggangkan layout mobile ke 1280 px |

### Prompt untuk Claude Code (jalankan di Hari 1, sebelum fitur)

```text
Baca docs/DESIGN-SYSTEM.md, docs/PRD.md, CLAUDE.md, dan buka semua gambar di docs/references/.
Implementasikan fondasi design system: tokens.css, canvas.css, glass.css, layout.css, atribut html
(data-theme, data-glass, data-fx), pemetaan shadcn/Tailwind (11.3), lalu komponen P0 (Bagian 12) dan halaman /styleguide
(11.4). Cocokkan komponen signature dengan referensi secara visual. Efek bertingkat (6.1 dan 6.9): minimal di HP/sentuh, penuh (E1–E4, E6 wajib) di desktop, dengan governor performa dan dukungan prefers-reduced-motion.
Setelah selesai: jalankan typecheck dan lint, ambil tangkapan layar /styleguide pada 390px dan 1280px
(terang dan gelap), bandingkan dengan referensi, perbaiki selisih yang jelas, perbarui docs/STATUS.md, lalu commit.
```

### Checklist review visual (Product Owner)

1. `/styleguide` di HP dan di laptop: tidak ada elemen terpotong atau tumpang tindih.
2. Pindah segmen/tab: knob bergeser halus, tidak melompat, tetap bisa dipakai dengan keyboard di desktop.
3. Karusel poster: geser di HP; di laptop berubah jadi grid.
4. Tiga Slot: bertumpuk di HP, sebaris di laptop; Slot kosong berbingkai garis putus.
5. Matikan Efek Kaca: tidak ada blur, teks tetap terbaca.
6. Mode gelap: permata tetap pastel, teks tetap kontras.
7. Aktifkan "Kurangi gerakan" di sistem: tidak ada animasi mencolok tersisa.
8. Bandingkan lima komponen (poster, folder, chip, hero, knob) dengan gambar referensi; catatan selisih dikirim kembali ke Claude Code.
9. **Desktop:** latar bergerak pelan; kartu poster miring mengikuti kursor dengan kilau; panel kaca punya sorot cahaya; folder membuka saat disorot; hero berlapis mengikuti kursor.
10. **HP:** semua tampilan di atas **tidak** bergerak (tidak ada tilt/parallax/mesh), tetap rapi dan cepat.
11. Ubah Efek ke Minim di desktop: semua gerak mewah berhenti, UI tetap lengkap. Ubah ke Otomatis: kembali penuh.
12. Aktifkan "Kurangi gerakan" di sistem: tidak ada tilt/parallax/mesh bergerak; kaca tetap ada.
13. Panel FPS di `/styleguide`: ≥ 55 fps di laptop; klik "Simulasikan beban" → toast efek diturunkan.

*Akhir dokumen.*

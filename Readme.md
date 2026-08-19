# Media Monitoring Platform API

Aplikasi ini adalah backend service untuk mengelola data artikel dan media sosial (_mentions_) dari seed_mentions.json. Dibangun menggunakan **Node.js, Express, TypeScript, dan PostgreSQL**.

Proyek ini dibuat secara transparan **tanpa menggunakan ORM** untuk memperlihatkan desain skema tabel dan indeks basis data secara langsung.

---

## 1. Panduan Menjalankan Aplikasi

Ikuti langkah-langkah di bawah ini secara berurutan untuk memasang dan menjalankan aplikasi di komputer lokal Anda.

### Prasyarat

Pastikan komputer Anda sudah terpasang aplikasi berikut:

- **Node.js** (versi 18 atau yang terbaru)
- **PostgreSQL** server yang sedang aktif

---

### 1. Kloning Repositori

Unduh project dari repositori GitHub dan masuk ke dalam direktori project:

```bash
git clone https://github.com/R1fky/people-and-pixel-test.git
cd media-monitoring-api
```

### 2. Pasang Dependencies

Pasang semua pustaka (_library_) yang dibutuhkan oleh project:

```bash
npm install
```

### 3. Konfigurasi Environment (`.env`)

Buat file baru bernama `.env` di direktori utama (_root_) project dengan menyalin dari file contoh:

```bash
cp .env.example .env
```

Buka file `.env` tersebut, lalu sesuaikan nilai konfigurasinya dengan akun database PostgreSQL lokal Anda:

```env
PORT=5000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=media_monitoring
DATABASE_USER=postgres
DATABASE_PASSWORD=password_postgres_anda
```

### 4. Pembuatan Database & Migrasi Skema SQL

Aplikasi ini mematuhi aturan pengujian untuk **tidak menggunakan ORM auto-magic** agar arsitektur database terlihat jelas.

1. Buka aplikasi manajemen PostgreSQL Anda (seperti pgAdmin, DBeaver, atau psql client).
2. Buat database baru bernama `media_monitoring`.
3. Jalankan perintah SQL berikut untuk membuat tabel dan indeks performa:

```sql
CREATE TABLE mentions (
    id BIGSERIAL PRIMARY KEY,
    external_id VARCHAR(255) NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_normalized VARCHAR(255) NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    url TEXT NOT NULL,
    url_normalized TEXT NOT NULL,
    author TEXT,
    published_at TIMESTAMPTZ,
    engagement INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT mentions_source_external_id_unique
        UNIQUE (source_normalized, external_id),
    CONSTRAINT mentions_url_unique
        UNIQUE (url_normalized)
);

-- Indeks optimasi performa pencarian dan statistik
CREATE INDEX mentions_source_idx
    ON mentions (source_normalized);

CREATE INDEX mentions_published_at_idx
    ON mentions (published_at);

CREATE INDEX mentions_source_published_at_idx
    ON mentions (source_normalized, published_at);
```

### 5. Jalankan Aplikasi

Jalankan server backend dalam mode pengembangan (_development mode_):

```bash
npm run dev
```

Jika berhasil, terminal Anda akan menampilkan log seperti berikut:

```text
Database connected
Server running on http://localhost:5000
```

---

## Daftar Endpoint API

Semua rute (_endpoint_) API berjalan di alamat dasar `http://localhost:5000/internal/mentions`:

### 1. Ingest Data Massal (Bulk Ingest)

- **Method:** `POST`
- **URL:** `/bulk`
- **Fungsi:** Memasukkan data masal secara _idempotent_ (mencegah data ganda walau dikirim berkali-kali).
- **Format Payload (Request Body):**
  Backend mewajibkan data dikirim dalam bentuk **Objek JSON** yang membungkus sebuah array dengan kunci bernama `"mentions"`.

  ```json
  {
    "mentions": [
      {
        "external_id": "str-99120",
        "source": "The Star",
        "title": "Ringgit strengthens against US dollar in early trade",
        "content": "<p>The ringgit opened higher against the greenback on Monday, buoyed by&nbsp;improved sentiment.</p>",
        "url": "https://thestar.com.my",
        "author": "Aisyah Rahman",
        "published_at": "2026-08-10T08:15:00Z",
        "engagement": 412
      },
      {
        "external_id": "nst-40021",
        "source": "New Straits Times",
        "title": "MRT Line 3 construction hits 40% completion",
        "content": "Works on the MRT3 Circle Line have reached 40 per cent.",
        "url": "https://nst.com.my",
        "author": null,
        "published_at": "2026-08-10 08:20:00",
        "engagement": "1,204"
      }
    ]
  }
  ```

### 2. Pencarian Data (Search)

- **Method:** `GET`
- **URL:** `/`
- **Query Params:** `?search=kata_kunci&source=nama_media&page=1&limit=10&from=2026-08-10&to=2026-08-15`

### 3. Statistik Grafik (Stats)

- **Method:** `GET`
- **URL:** `/stats`
- **Query Params:**
  - Berdasarkan Media: `?group_by=source`
  - Berdasarkan Tanggal: `?group_by=day`

---

### 2. Strategi Normalisasi Data (`normalize.ts`)

**Tujuan Utama:**
Membersihkan data lapangan yang kotor (_messy data_) agar formatnya seragam. Hal ini krusial agar sistem dapat mendeteksi data duplikat secara akurat sebelum disimpan ke database.

Setiap input data mentah otomatis dibersihkan melalui fungsi fungsi berikut:

- **Penyamaan Nama Media (`normalizeSource`)**
  - _Tujuan:_ Menghindari duplikasi akibat beda ketikan nama media.
  - _Cara Kerja:_ Mengubah teks seperti `"The Star"`, `"thestar"`, atau `"thestar "` menjadi satu nama standar kecil (`"the star"`), lalu menampilkan nama rapi `"The Star"` pada UI menggunakan sistem kamus alias.

- **Pembersihan HTML & Keamanan (`normalizeContent`)**
  - _Tujuan:_ Mengamankan database dari serangan siber (XSS) dan menghemat ruang penyimpanan.
  - _Cara Kerja:_ Menghapus paksa tag berbahaya seperti `<script>` dan `<style>`, menghilangkan semua tag HTML lainnya, serta merapikan spasi yang berantakan.

- **Konversi Angka Interaksi (`normalizeEngagement`)**
  - _Tujuan:_ Memastikan data interaksi bisa dihitung secara matematika untuk kebutuhan grafik statistik.
  - _Cara Kerja:_ Otomatis membuang tanda koma teks angka (misal: `"1,204"` diubah menjadi angka murni `1204`).

- **Standardisasi Judul (`normalizeTitle`)**
  - _Tujuan:_ Menjaga konsistensi format data.
  - _Cara Kerja:_ Mengubah judul yang hanya berisi spasi kosong (`"   "`) menjadi nilai `null` agar cocok dengan format media sosial (seperti Twitter/X).

- **Standardisasi URL (`normalizeUrl`)**
  - _Tujuan:_ Mencegah duplikasi berita yang bersumber dari link yang sama.
  - _Cara Kerja:_ Memaksa alamat web menggunakan huruf kecil dan menghapus tanda garis miring penutup (`/`) di akhir link agar format URL selalu identik.

- **Parsing Banyak Format Tanggal (`parsePublishedAt`)**
  - _Tujuan:_ Mengatasi variasi format tanggal yang dikirim oleh sistem luar.
  - _Cara Kerja:_ Otomatis mendeteksi dan mengubah 4 jenis format (nilai `null`, angka _timestamp_ detik, format regional `DD/MM/YYYY`, dan format string ISO) menjadi format tanggal standar database.

## 🧠 Aturan Duplikat & Idempotensi

Sistem pengumpulan data lapangan sangat rawan mengirimkan berita berulang. Untuk menjaga keaslian data, backend menggunakan fungsi normalisasi teks dan mengunci aturan duplikat langsung di database lewat dua kondisi:

### 1. Duplikat Berdasarkan Sumber & ID (`source_normalized` + `external_id`)

- **Logika:** Jika nama media dan ID berita yang dikirim sudah pernah terdaftar, sistem mendeteksi ini sebagai **Berita Lama yang Diperbarui**.
- **Tindakan (Upsert):** Sistem **tidak akan menambah baris baru**, melainkan otomatis melakukan **update data** pada jumlah interaksi (`engagement`) terbaru.

### 2. Duplikat Berdasarkan Alamat Web (`url_normalized`)

- **Logika:** Jika nama media atau ID beritanya berbeda, tetapi setelah dicek ternyata **alamat URL-nya sama**, maka sistem menganggap isi beritanya 100% sama.
- **Tindakan:** Sistem mengidentifikasi ini sebagai **Berita Duplikat** dan secara tegas **menolak memasukkan data tersebut** ke database agar statistik grafik tidak rusak.

## ⚡ Optimasi Performa (Database Indexing)

Untuk memenuhi kebutuhan PR Analyst dalam memuat data pencarian dan grafik dasbor secara instan, tiga indeks komposit sengaja ditambahkan berdasarkan pola kueri (_query patterns_) pada endpoint Search dan Stats:

1. **`CREATE INDEX mentions_source_idx ON mentions (source_normalized);`**
   - **Kegunaan:** Mempercepat penyaringan filter berdasarkan media pada kueri pencarian dan mempercepat proses pengelompokan data untuk grafik pada endpoint statistik (`GET /internal/mentions/stats?group_by=source`).
2. **`CREATE INDEX mentions_published_at_idx ON mentions (published_at);`**
   - **Kegunaan:** Mengoptimalkan performa pengurutan data tabel berdasarkan tanggal terbit (_stable sort order_) serta filter pencarian rentang waktu (`from` / `to`).
3. **`CREATE INDEX mentions_source_published_at_idx ON mentions (source_normalized, published_at);`**
   - **Kegunaan:** Indeks komposit gabungan untuk mempercepat endpoint kueri statistik harian (`GET /internal/mentions/stats?group_by=day`) sehingga database tidak perlu melakukan pemindaian penuh (_Full Table Scan_) saat data sudah mencapai jutaan baris.

## ⏱️ Linimasa & Estimasi Waktu Pengembangan

Proyek ini diselesaikan secara terstruktur melalui **2 Fase Utama** dengan pembagian waktu sebagai berikut:

### 1. Fase Analisis Sistem (1 Hari)

Fase ini berfokus pada pemahaman karakteristik data dan aturan bisnis sebelum mulai menulis kode:

- **Membaca & Mempelajari Data:** Mengamati variasi format data lapangan yang kotor (_messy data_), seperti format tanggal yang beragam dan angka _engagement_ yang membawa karakter koma.
- **Merancang Aturan Duplikat:** Merumuskan logika bisnis kapan data harus diperbarui (_Upsert_) dan kapan data harus ditolak (_Unique URL_) demi menjaga keaslian statistik.

### 2. Fase Implementasi & Koding (8 Jam Efektif)

Eksekusi teknis dari awal hingga proyek selesai dikerjakan dalam **2 sesi utama**:

- **Sesi Backend (4 Jam):** Membangun server Express dengan TypeScript, membuat fungsi utilitas pembersihan data (`normalize.ts`), dan menulis kueri SQL mentah untuk menangani idempotensi data tanpa ORM.
- **Sesi Frontend & Sinkronisasi (4 Jam):** Membuat antarmuka UI dasbor, menyelaraskan format input _bulk text area_ agar sesuai dengan kebutuhan API, serta melakukan pengujian menyeluruh (_testing & debugging_) untuk memastikan tidak ada kendala port bentrok di lingkungan lokal.

## 🚀 Pengembangan Selanjutnya (Jika Diberi Waktu 1 Minggu)

Jika diberikan waktu tambahan, berikut adalah prioritas perbaikan dan fitur baru yang akan diimplementasikan terlebih dahulu untuk membuat sistem ini lebih siap pakai (_production-ready_):

### 1. Fondasi Backend & Keamanan

- **Sistem Migrasi Resmi (SQL Migration):** Membuat folder tata kelola skema database terstruktur (menggunakan tools seperti `db-migrate` tanpa ORM) agar setiap perubahan tabel terdokumentasi dan dapat dilacak jejaknya.
- **Validasi Request & Error Handling Ketat:** Memperkuat validasi skema JSON langsung di tingkat _middleware_ Express sebelum masuk ke _controller_, serta membangun _Global Error Handler_ terpusat untuk menangkap semua jenis _exception_ agar server tetap stabil dan tidak pernah _crash_ meskipun menerima input yang rusak.

### 2. Fondasi Frontend

- **Dasbor Ringkasan Analitik (Summary Widgets):** Menambahkan komponen kartu informasi statik di bagian atas UI untuk menampilkan metrik penting secara instan, seperti _Total Berita_, _Total Interaksi_, dan _Media Paling Populer_.
- **Pencarian Pintar (_Debounced Search_):** Mengoptimalkan kolom pencarian di frontend agar otomatis memfilter isi tabel beberapa milidetik setelah pengguna selesai mengetik, tanpa perlu menekan tombol cari secara manual.
- **Fitur Reset Database Terbuka (_Clear Table Tool_):** Menyediakan tombol khusus untuk mengosongkan seluruh isi tabel via perintah `TRUNCATE` dengan pengaman popup konfirmasi, sehingga memudahkan tim penguji (_QA/Reviewer_) untuk melakukan uji coba data dari awal berulang kali.

## Riwayat Commit

git log
commit 6439df5af3acd9916751bb4eb2d3f895067f0776 (HEAD -> main, origin/main)
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 23:36:46 2026 +0700

    ubah port

commit 56eaf259c59e4d081fa1c47a772577e67eb3d30b
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 23:26:46 2026 +0700

    merubah port back-end

commit 8211e3bae88e4eecac53f286fbd0a94640f10d1a
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 23:21:53 2026 +0700

    memperbaiki dashboard

commit b91648e020b0f3d890e1ff03f1eb97a5705a3716
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 22:38:28 2026 +0700

    membuat dashboard sederhana

commit 6a2f8d7c8b00fb62bb56d4ee90bd0cc1c9038542
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 22:04:32 2026 +0700

    membuat endpoint filter dan statistik

commit bd9e5fa8aa29df39b8067af955a6e49426c429e7
Author: R1fky <rifkiyuda11@gmail.com>
Date: Wed Aug 19 21:33:06 2026 +0700

    membuat endpoint bulk

(END)

## 🔍 Potongan Kode Paling Berisiko Tinggi (Target Pengujian Utama)

Berdasarkan analisis arsitektur sistem, potongan kode di bawah ini merupakan area fungsional yang wajib diuji secara ketat karena memiliki risiko kegagalan logika (_logical bug_) tertinggi saat menangani data lapangan:

### 1. Loop Sinkronisasi & Pengecekan Parsial Data Massal

Berkas: `src/services/mention.service.ts` (Fungsi: `processMentions`)

```typescript
for (const input of mentions) {
  const mention = normalizeMention(input);

  // Titik Risiko Kritis 1: Potensi Race Condition jika array input memiliki URL kembar
  const existingByIdentity = await findBySourceAndExternalId(client, mention.source_normalized, mention.external_id);

  if (existingByIdentity) {
    await updateMention(client, existingByIdentity.id, mention);
    updated++;
    continue;
  }

  // Titik Risiko Kritis 2: Pengecekan URL sebelum COMMIT rawan meloloskan data duplikat internal
  const existingByUrl = await findByUrl(client, mention.url_normalized);

  if (existingByUrl) {
    duplicated++;
    continue;
  }

  await insertMention(client, mention);
  inserted++;
}
```

### 2. Agregasi Hari Berdasarkan Waktu Server Database

Berkas: `src/repositories/mention.repository.ts` (Fungsi: `getStatsByDay`)

```typescript
export async function getStatsByDay() {
  const result = await pool.query(`
    SELECT
      -- Titik Risiko Menengah: Mengabaikan zona waktu asal artikel (mengikuti zona waktu OS/Server)
      DATE(published_at) AS day,
      COUNT(*)::integer AS total
    FROM mentions
    WHERE published_at IS NOT NULL
    GROUP BY DATE(published_at)
    ORDER BY day ASC
  `);

  return result.rows;
}
```

### 3. Kueri Pemotongan Halaman (Pagination) Skala Besar

Berkas: `src/repositories/mention.repository.ts` (Fungsi: `findMentions`)

```typescript
// Titik Risiko Performa: Penggunaan OFFSET dinamis membuat kueri melambat secara eksponensial saat data berjumlah besar
const dataQuery = `
  SELECT
    id, external_id, source, title, content, url, author, published_at, engagement, created_at, updated_at
  FROM mentions
  \${whereClause}
  ORDER BY published_at DESC NULLS LAST, id DESC
  LIMIT $\${parameterIndex}
  OFFSET $\${parameterIndex + 1}
`;
```

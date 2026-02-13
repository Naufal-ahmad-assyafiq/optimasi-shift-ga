## Fitur Utama

Sistem memiliki fitur sebagai berikut:

### 1. Pengaturan Durasi Jadwal
- Jadwal dapat dibuat selama:
  - 7 hari
  - 14 hari
  - 28 hari
  - 30 hari
  - 31 hari
- Sistem otomatis membagi tampilan ke dalam format mingguan pada hasil dan export Excel.

### 2. Pengaturan Shift Kerja
- Tersedia 3 jenis shift:
  - Pagi
  - Siang
  - Malam
- Jam kerja masing-masing shift dapat diubah langsung dari antarmuka (UI).

### 3. Pengaturan Kebutuhan Karyawan
- Jumlah kebutuhan karyawan per shift dapat ditentukan.
- Sistem akan mengoptimalkan distribusi agar memenuhi kebutuhan tersebut.

### 4. Libur Pabrik (Company Closed Days)
- Dapat diatur 1 atau 2 hari tutup per minggu.
- Jika 2 hari → otomatis Sabtu dan Minggu.
- Jika 1 hari → dapat memilih Sabtu atau Minggu.
- Pada hari tutup, seluruh shift otomatis kosong.

### 5. Aturan Optimasi
Sistem mempertimbangkan beberapa constraint:
- Tidak boleh double shift dalam satu hari.
- Tidak boleh shift malam langsung ke pagi.
- Batas maksimal shift per minggu.
- Batas maksimal shift malam per minggu.
- Pemerataan beban kerja antar karyawan.

### 6. Evaluasi Fitness dan Penalty
- Sistem menampilkan nilai Fitness dan Penalty.
- Penalty menunjukkan total pelanggaran aturan.
- Semakin kecil penalty, semakin optimal jadwal.

### 7. Export Excel Berwarna
- Jadwal dapat diekspor ke file Excel.
- Pewarnaan otomatis:
  - Pagi: Biru
  - Siang: Orange
  - Malam: Ungu
  - Libur: Merah
- Format Excel disusun per minggu meskipun durasi lebih dari 7 hari.

### 8. Tampilan Interaktif
- Jadwal ditampilkan per hari.
- Menampilkan status:
  - Buka
  - Tutup (Libur Pabrik)


  

## Cara Membuka Aplikasi (Quick Start)

Berikut langkah cepat untuk menjalankan aplikasi di komputer lokal:

### 1. Clone Repository

git clone https://github.com/Naufal-ahmad-assyafiq/optimasi-shift-ga.git
cd optimasi-shift-ga

### 2. Jalankan Backend

Masuk ke folder backend:

cd backend
npm install
node server.js

Jika berhasil, akan muncul:

Backend running on http://localhost:4000

### 3. Jalankan Frontend

Buka terminal baru, lalu jalankan:

cd frontend
npm install
npm run dev

yaml
Salin kode

Jika berhasil, akan muncul alamat seperti:

Local: http://localhost:5173/

### 4. Buka di Browser

Buka browser dan akses:

http://localhost:5173

Aplikasi siap digunakan.

## Catatan Penting

- Backend harus dijalankan terlebih dahulu sebelum frontend.
- Jika backend tidak aktif, tombol "Optimize" tidak akan berfungsi.
- Pastikan Node.js sudah terinstall di komputer (minimal versi 16+).

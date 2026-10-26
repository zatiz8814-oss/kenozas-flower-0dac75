# Kenoza’s Flower

Toko bunga berbahasa Indonesia dengan tampilan pink pastel yang responsif, toko customer, dan ruang Admin. Customer mulai belanja cukup dengan nama, memilih rangkaian, menyimpan wishlist, lalu berbelanja dengan pengiriman ke rumah atau pengambilan langsung di toko.

Pesanan website langsung dicatat **Lunas / Selesai** tanpa persetujuan pembayaran dari Admin. Semua pesanan langsung berhasil tanpa menunggu konfirmasi. WhatsApp 081542327838 hanya untuk chat opsional. Transaksi pembelian langsung di toko dibuat lewat **Pesanan Offline** dan langsung selesai. Keduanya memiliki nomor KF otomatis, invoice dan struk PDF, pembaruan stok, dan laporan gabungan dengan penanda ONLINE/OFFLINE.

## Teknologi

- TanStack Start, React, TypeScript, Vite, Tailwind CSS, dan Radix Dialog.
- Netlify Functions untuk API, Netlify Database (Postgres) dengan Drizzle ORM untuk data, dan Netlify Blobs untuk foto unggahan.
- Netlify Identity untuk autentikasi Admin. Pelanggan memakai sesi belanja acak melalui cookie HttpOnly dengan masa aktif 30 hari; hash sesi dan data pelanggan disimpan di Netlify Database. Nama yang sama tidak membuka data pelanggan lain.
- jsPDF untuk invoice dan struk; Web Audio dan Speech Synthesis untuk bunyi dan ucapan dalam bahasa Indonesia.
- Netlify Image CDN untuk mengoptimalkan foto. Foto hero dibuat khusus untuk toko ini.

## Menjalankan secara lokal

Gunakan Node 22.13+ atau Node 24 dan pnpm.

```bash
pnpm install
netlify dev --port 8889
```

Buka http://localhost:8889. Netlify CLI diperlukan agar Functions, Identity, database, Blobs, dan Image CDN tersedia. Skema ada di `db/schema.ts`; migrasi di `netlify/database/migrations` diterapkan oleh platform saat deploy. Untuk perubahan skema, jalankan `pnpm exec drizzle-kit generate --name nama_perubahan`.

## Menggunakan toko

Customer dapat membuka **Mulai Belanja**, lalu mengetik nama tanpa password atau pendaftaran. **Pesanan Saya**, keranjang dan wishlist terhubung ke sesi browser, bukan nama. Refresh mempertahankan sesi selama cookie masih aktif. Keluar, menghapus cookie, atau berpindah browser memulai sesi baru; nama saja tidak dapat memulihkan riwayat lama. Profil pelanggan dapat mengganti nama tanpa password. Akun dan pesanan lama tetap tersimpan di database.

Ruang Admin tersedia lewat tautan **Ruang Admin** pada footer atau `/#admin`. Gunakan kredensial yang diminta saat pembuatan proyek; kredensial tidak ditampilkan di dokumentasi. Akun awal disiapkan saat login Admin pertama, setelah verifikasi hash bootstrap di server. Nama dan password dapat diubah melalui **Pengaturan**.

Buat transaksi langsung lewat **Pesanan Offline**, pilih produk dan jumlah, lalu isi nama pelanggan, harga satuan jika perlu, metode pembayaran, dan catatan. Laporan dapat diunduh sebagai CSV, dan backup data toko tersedia sebagai JSON tanpa informasi login.

## Perilaku pembayaran dan notifikasi

Pembayaran dicatat berhasil secara otomatis sesuai kebutuhan tugas ini. Aplikasi tidak terhubung ke bank, penerbit QRIS, atau penyedia penagihan; pemilihan metode mencatat transaksi dan tidak memindahkan uang. Tidak ada kebutuhan nomor telepon atau konfirmasi WhatsApp.

Pesanan dan status diperiksa setiap tujuh detik selama pengguna login dan halaman tetap terbuka. Admin menerima popup besar dan bunyi untuk pesanan baru. Customer menerima popup dan bunyi untuk perubahan status. Browser memerlukan interaksi pertama untuk mengaktifkan audio; tombol Suara ON/OFF menyimpan preferensi di perangkat. Suara ucapan bergantung pada dukungan bahasa browser.

Checkout mengunci baris stok dalam transaksi database, menghitung ulang harga dan promo di server, dan memakai kunci idempotensi agar pengulangan permintaan tidak membuat pesanan ganda. Produk dihapus dengan pengarsipan agar riwayat invoice tetap utuh. Pesanan website yang diambil di toko tetap berlabel ONLINE; OFFLINE khusus transaksi yang dicatat Admin di kasir.

## Pemeriksaan

Kode dan hubungan antarkomponen ditinjau melalui pembacaan berkas. Build dan validasi dijalankan oleh pipeline platform. Pengujian interaktif terhadap layanan setelah deploy belum dilakukan dalam sesi pembuatan ini. Ikuti `TESTING.md` untuk memeriksa dua alur lengkap dengan akun customer dan Admin di browser berbeda.

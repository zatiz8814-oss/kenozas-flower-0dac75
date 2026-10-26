# Pemeriksaan alur setelah deploy

Status: daftar penerimaan untuk dijalankan pada situs hasil deploy; belum dieksekusi secara interaktif dalam sesi ini.

Gunakan satu browser untuk customer dan browser atau jendela privat lain untuk Admin agar sesi login tidak saling menggantikan. Klik sekali pada masing-masing halaman agar audio diizinkan browser.

## Customer dan pesanan online

1. Klik Mulai Belanja dan isi nama saja; pastikan tidak ada password, pendaftaran, email, telepon, atau OTP. Refresh dan pastikan sesi tetap aktif.
2. Cari bunga, pilih kategori, filter stok/harga, dan coba sorting harga. Simpan wishlist dan refresh untuk memeriksa persistensi.
3. Tambahkan bunga ke keranjang, ubah jumlah, hapus satu item, lalu refresh. Periksa jumlah dan subtotal.
4. Checkout dengan pilihan Online. Pastikan alamat rumah wajib, sedangkan catatan kurir dan catatan pesanan opsional.
5. Terapkan kode promo aktif dan pastikan diskon sesuai. Kode tidak aktif harus ditolak.
6. Pilih metode pembayaran dan tekan Bayar & Buat Pesanan. Pastikan popup besar menampilkan nomor KF, pembayaran berhasil dan status Selesai, dengan bunyi/ucapan.
7. Periksa Pesanan Saya setelah refresh. Unduh invoice PDF dan struk PDF; periksa nama, nomor, tanggal, item, harga, diskon, total, metode, jenis dan status. Coba cetak invoice.
8. Pada browser Admin yang sudah terbuka, tunggu maksimal satu interval polling. Pastikan pesanan baru tampil dengan popup besar dan suara.
9. Pastikan pesanan langsung Selesai/Lunas di customer dan Admin tanpa tombol konfirmasi wajib. Chat WhatsApp opsional harus menuju 6281542327838 dengan nomor pesanan.
10. Periksa stok berkurang sesuai jumlah, pendapatan dan laporan Admin bertambah. Ulasan hanya dapat dikirim setelah customer membeli produk dan pesanan selesai.
11. Coba checkout Ambil di toko. Alamat tidak wajib dan invoice menunjukkan pengambilan di toko; transaksi tetap ONLINE karena dipesan melalui website.

## Transaksi offline

1. Login Admin memakai kredensial yang diminta dalam pembuatan proyek, lalu buka Pesanan Offline.
2. Pilih beberapa produk dan jumlah. Lanjutkan pembayaran, masukkan nama pelanggan, coba harga satuan khusus, pembayaran, dan catatan.
3. Simpan transaksi. Pastikan popup keberhasilan, nomor KF baru, pembayaran Lunas dan status Selesai.
4. Unduh invoice/struk dan coba cetak. Pastikan label OFFLINE dan rincian benar.
5. Refresh dan periksa transaksi tetap ada, stok berkurang, laporan online/offline dan pendapatan terbarui.
6. Download laporan CSV dan backup JSON; periksa total dan pastikan data login tidak disertakan.

## Admin dan kasus gagal

1. Tambah/edit produk, unggah foto JPG/PNG/WebP, ubah kategori/harga/stok, lalu arsipkan. Riwayat pesanan lama harus tetap utuh.
2. Tambah/edit kategori dan periksa nama kategori produk ikut berubah. Buat, edit dan nonaktifkan promo.
3. Ubah username/password Admin dari Pengaturan dan login kembali menggunakan nilai baru.
4. Customer tidak dapat menjalankan aksi Admin atau membaca pesanan customer lain. Permintaan mutasi lewat GET harus ditolak.
5. Checkout melebihi stok atau dengan harga produk yang diubah di browser harus memakai validasi dan harga server. Transaksi gagal tidak boleh mengurangi stok sebagian.
6. Ulangi permintaan checkout dengan kunci idempotensi yang sama: hanya satu pesanan/invoice dan satu pengurangan stok.
7. Buka dua customer yang membeli stok terakhir bersamaan: hanya satu transaksi berhasil; stok tidak negatif.
8. Periksa tampilan pada lebar 320px, 375px, tablet, dan desktop; coba keyboard, fokus modal, scroll, dan tombol Suara ON/OFF.

9. Periksa harga katalog awal Rp45.000–Rp99.000, checkout memakai harga database terbaru, dan harga invoice lama tidak berubah. Periksa tautan sosial serta perbedaan ONLINE/OFFLINE di checkout dan footer.

### Belanja dengan nama saja

- Isi nama satu karakter, nama dengan spasi, serta nama yang sudah dipakai pelanggan lain. Semuanya harus dapat mulai belanja tanpa password.
- Refresh di browser yang sama: keranjang, wishlist, profil, dan pesanan tetap tersedia selama sesi aktif (30 hari).
- Gunakan nama sama di browser privat: riwayat, keranjang dan wishlist harus terpisah. Nama Admin pun tidak memberi akses Admin.
- Ubah nama profil tanpa password dan pastikan kepemilikan pesanan tetap sama.
- Keluar: sesi lama harus ditolak oleh API. Mulai lagi dengan nama sama menghasilkan sesi baru, tanpa membuka pesanan lama.
- Hapus cookie atau gunakan sesi kedaluwarsa: riwayat lama tidak boleh terbuka hanya dengan mengetik nama.
- Saat layanan Identity gagal, pelanggan tetap dapat mulai belanja; Admin tetap memerlukan autentikasi.
- Coba request tanpa origin yang sama, cookie palsu, serta aksi Admin dari sesi pelanggan: semuanya ditolak.

## Custom buket dan bantuan WhatsApp

- Buka “Tanya Kenoza”, pilih setiap topik, tulis pertanyaan, dan periksa pratinjau pesan. WhatsApp harus membuka nomor toko dengan teks sesuai topik; pesan tetap dikirim oleh pelanggan.
- Pada sesi dengan pesanan, pilih nomor pesanan di bantuan chat dan pastikan nomor tersebut masuk pesan. Sesi lain tidak boleh menampilkan pesanan itu.
- Checkout produk Rp45.000, tambah 3 mawar, 2 tulip, wrapping premium, dan pita satin. Tambahan harus Rp46.000 per buket; total sebelum promo untuk dua buket harus Rp182.000.
- Periksa reset tambahan, promo, transaksi offline, serta checkout tanpa custom. Jumlah tambahan nol tidak mengubah harga asli.
- Setelah checkout, periksa detail Admin, riwayat pelanggan, PDF, dan cetak: jenis/jumlah tambahan serta harga custom harus tersimpan. Stok produk dasar berkurang sesuai jumlah buket; tangkai tambahan menggunakan tarif, bukan stok tangkai terpisah.
- Coba suara chat, pemilihan custom, dan sapaan setelah interaksi. Suara OFF harus mematikan semuanya, termasuk ucapan; uji juga di ponsel.
- Balasan bot langsung di WhatsApp belum tersedia; fitur bantuan website tidak menerima pesan masuk dari WhatsApp.

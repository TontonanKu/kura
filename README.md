# 🐢 Kura Card - Permainan Kartu Kura

Game kartu seru terinspirasi dari UNO dengan mekanisme kartu spesial unik (**Swap**, **Shell**, dan **Shield**) serta visual gameplay cozy round table.

---

## 🚀 Fitur Terbaru (Update)

1. **Ukuran & Rasio Kartu Presisi 800 x 1000 (Rasio 4:5):**
   - Kartu di tangan, draw pile, dan discard pile kini berukuran presisi (120px x 150px) dengan `object-fit: contain` sehingga tidak terpotong sama sekali. Seluruh detail ilustrasi dan angka kartu terlihat utuh dan tajam.
2. **Karakter Player Lebih Besar & Meja Nyaman:**
   - Avatar pemain diperbesar (90px - 95px) lengkap dengan border bercahaya, badge nama, status peran (*Host*, *Bot*, *Giliran Aktif*), dan jumlah kartu.
   - Area meja kini terisi seimbang dan tidak kosong melompong.
3. **Sistem Multiplayer Lengkap (Create Room & Lobby):**
   - **Buat Room Sendiri:** Tentukan **Nama Room**, **Kata Sandi (Opsional)**, dan **Jumlah Pemain (2, 3, atau 4 Pemain)**.
   - **Opsi Isi Bot Otomatis:** Pilihan untuk mengisi slot pemain yang kosong dengan Bot AI.
   - **Daftar Ruangan (Lobby):** Menampilkan status ruangan, jumlah pemain, dan indikator terkunci (`🔒`).
   - **Ruang Tunggu (Pre-Game Lobby):** Menampilkan slot pemain, tombol *Siap (Ready)*, dan kontrol Host untuk menambah Bot atau memulai permainan.
   - **Realtime Sync via BroadcastChannel:** Mendukung mabar multi-tab/multi-jendela di browser secara instan.
4. **Mode vs Bot AI:**
   - Pilihan jumlah pemain fleksibel:
     - **2 Pemain (1 vs 1)** melawan Reyy.
     - **3 Pemain (1 vs 2 Bot)** melawan Luna dan Reyy.
     - **4 Pemain (Full Table)** melawan Kuro, Reyy, dan Luna.

---

## 🎮 Cara Menjalankan Game

Server game sedang berjalan di:
👉 **[http://localhost:5173/](http://localhost:5173/)**
Atau buka di perangkat dalam satu jaringan Wi-Fi: `http://192.168.100.6:5173/`

Perintah manual:
```bash
# Jalankan mode pengembangan
npm run dev

# Build untuk produksi
npm run build
```

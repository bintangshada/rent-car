# FleetSync — Rental Car IoT Tracking

Dashboard monitoring armada rental berbasis Next.js 16 + Prisma + Supabase (PostgreSQL) + MQTT.
Aplikasi dapat membaca **beban penumpang**, **lokasi GPS**, serta **mengaktifkan/menonaktifkan motor** dari jarak jauh.

> Belum punya Supabase? Aplikasi otomatis memakai fallback store lokal (`.data/store.json`) yang berisi data seeder yang sama, sehingga semua halaman tetap bisa dicoba.

## Fitur

- Autentikasi email/password dengan hash **bcrypt** dan session **JWT di httpOnly cookie** (login, register, logout).
- Halaman terpisah untuk tiap fitur (bukan modal):
  - `/dashboard` — ringkasan armada, peta, beban, peringatan.
  - `/vehicles` — daftar armada, pencarian, aktif/nonaktif unit.
  - `/vehicles/new` — pendaftaran kendaraan baru.
  - `/vehicles/[id]` — detail telemetri, peta, grafik beban, konfigurasi ambang batas.
  - `/tracking` — live tracking GPS seluruh armada.
  - `/weight` — monitoring beban dan ambang keamanan tiap unit.
  - `/control` — aktifkan/nonaktifkan motor via MQTT + indikator LED + riwayat perintah.
  - `/logs` — audit log telemetri dengan filter dan ekspor CSV.
  - `/settings` — konfigurasi broker, topik, dan unduh firmware ESP32.
  - `/users` — manajemen akun (khusus Fleet Commander).
- Real-time via **Server-Sent Events** yang menerima event dari bridge MQTT server.
- Demo simulator telemetri (tombol **Demo**) untuk mencoba aplikasi tanpa hardware.
- Prisma schema + migrasi + seeder; siap dipakai dengan Supabase Postgres.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:3000 dan masuk dengan akun seeder:

| Peran | Email | Password |
| --- | --- | --- |
| Fleet Commander | `admin@safetycar.id` | `Admin123!` |
| Safety Officer | `officer@safetycar.id` | `Officer123!` |
| Armada Driver | `driver@safetycar.id` | `Driver123!` |

Tanpa `.env`, aplikasi memakai data fallback lokal dan broker MQTT publik HiveMQ.

## Supabase + Prisma

1. Buat project Supabase, lalu ambil connection string PostgreSQL (transaction pooler).
2. Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` dan `JWT_SECRET` (minimal 32 karakter acak).
3. Jalankan migrasi dan seeder:

```bash
npm run db:migrate
npm run db:seed
```

`npm run db:seed` membuat 3 pengguna, 3 kendaraan, dan riwayat telemetri awal.
Seeder bersifat idempoten (bisa dijalankan ulang).

Catatan: Prisma 7 memakai `prisma7.config.ts` dan generated client di `generated/prisma`.
`npm run build` otomatis menjalankan `prisma generate`.

## MQTT

Default broker: HiveMQ (`broker.hivemq.com:1883` untuk ESP32, `wss://broker.hivemq.com:8884/mqtt` untuk browser dan bridge server). Bridge server memakai WebSocket karena port TCP 1883 sering diblokir jaringan/ISP; bisa ditimpa lewat `MQTT_BRIDGE_URL`.

Topik:

| Arah | Topik |
| --- | --- |
| ESP32 → Dashboard | `bintang/if-upn/safety-car/data/<DEV-CODE>` |
| Dashboard → ESP32 | `bintang/if-upn/safety-car/data/<DEV-CODE>/control` |
| ESP32 → Dashboard (ack) | `bintang/if-upn/safety-car/data/<DEV-CODE>/ack` |

Payload telemetri:

```json
{
  "device": "DEV-001",
  "weight": 3.65,
  "status": "WARNING",
  "relay": true,
  "lat": -7.33512,
  "lng": 112.78912,
  "speed": 28.0,
  "satellites": 8
}
```

Payload perintah:

```json
{ "command": "FORCE_OFF", "device": "DEV-001", "relay": false }
```

Perintah yang dikenal firmware: `FORCE_ON`, `FORCE_OFF`, `TARE`.

### Melihat output beban dari mana saja

1. **Arduino Serial Monitor** (baud 115200): firmware mencetak `WiFi terhubung`, `MQTT terhubung`,
   topik telemetri/kontrol, lalu tiap 2 detik baris `[MQTT TX] ... berat=...kg status=...`,
   serta `[MQTT RX] ...` saat ada perintah dari dashboard.
2. **HiveMQ WebSocket Client** (https://www.hivemq.com/demos/websocket-client/):
   - Host: `broker.hivemq.com`, Port: `8884`, pilih **WebSocket** / `wss://broker.hivemq.com:8884/mqtt`.
   - Klik **Connect**, lalu **Subscribe** dengan topik `bintang/if-upn/safety-car/data/#` (QoS 0).
   - Pesan telemetri akan muncul berisi `weight`, `status`, `relay`, `lat`, `lng`, `speed`.
   - Untuk menguji kontrol, publish ke `bintang/if-upn/safety-car/data/DEV-001/control`
     dengan payload `{"command":"FORCE_ON","device":"DEV-001","relay":true}`.
3. **Dashboard**: browser membuka koneksi MQTT WebSocket sendiri dan langsung menimpa
   tampilan beban/GPS dengan payload terbaru (lihat `/dashboard`, `/weight`, `/control`).
   Status `MQTT connected` di header memakai status browser bila bridge server down.
   Raw payload per kendaraan bisa dilihat di `/settings → Output MQTT Live`.
4. **Database/riwayat**: hanya bridge server yang menyimpan telemetri ke Supabase/fallback store.

Jika HiveMQ client tidak menerima apa pun: cek Serial Monitor ESP32 (`MQTT terhubung` harus muncul),
pastikan `DEVICE_CODE` sama dengan kode kendaraan di aplikasi, dan topik subscribe memakai `#` wildcard.

### Relay tidak mati saat overload

Kode firmware sudah benar: `kontrolKeamanan()` menyalakan buzzer dan memutus relay dalam siklus yang
sama (`firmware/safety_car/safety_car.ino:247`). Saat `overload = true`, GPIO23 ditulis `RELAY_OFF`
dan Serial Monitor menampilkan `Pin RELAY (GPIO23): HIGH` (mode ACTIVE LOW). Kalau motor tetap jalan,
masalahnya di hardware:

1. **Polaritas modul**: sebagian modul SRD-05VDC-SL-C ber-**HIGH level trigger**. Ubah
   `RELAY_ACTIVE_LOW = false` lalu upload ulang.
2. **Level 3.3V vs 5V**: modul dengan optocoupler dan jumper JD-VCC terpasang sering tetap
   `ON` karena IN=HIGH cukup 3,3 V tidak sampai ambang 5 V. Lepas jumper JD-VCC, hubungkan VCC
   modul ke 3V3 ESP32 dan JD-VCC ke sumber 5 V eksternal (GND disamakan), atau pakai level
   shifter / transistor NPN.
3. **Kabel beban**: motor harus di **COM + NO**. Kalau di **NC**, relay justru menutup kontak
   saat de-energized sehingga motor tetap hidup.

Cara cepat: saat overload, lihat LED IN di modul. LED menyala → masalah polaritas/level.
LED mati tapi motor masih jalan → masalah kabel NC/NO.

### Broker Mosquitto lokal (opsional)

```bash
npm run mqtt:broker
```

Lalu set di `.env`:

```env
MQTT_BROKER_URL="localhost:1883"
NEXT_PUBLIC_MQTT_WS_URL="ws://localhost:9001/mqtt"
```

## Firmware ESP32

Source: `firmware/safety_car/safety_car.ino` (bisa diunduh juga dari `/settings`).

1. Install library di `firmware/safety_car/libraries.txt` melalui Arduino Library Manager.
2. Isi `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_HOST`, dan `DEVICE_CODE` sesuai kendaraan.
3. Sesuaikan `CALIBRATION_FACTOR`, `WARNING_KG`, dan `OVERLOAD_KG`.
4. Ubah `DEVICE_CODE` menjadi kode yang terdaftar di aplikasi (mis. `DEV-001`).

Pinout sesuai kode contoh:

| Komponen | GPIO |
| --- | --- |
| HX711 DT / SCK | 16 / 4 |
| GPS NEO-6M RX / TX (Serial2) | 32 / 33 |
| LCD I2C SDA / SCL | 21 / 22 |
| LED Merah / Kuning / Hijau | 5 / 18 / 19 |
| Buzzer | 26 |
| Relay | 23 |

Firmware membaca berat dalam gram lalu mengirim dalam kilogram, mengirim telemetri tiap 2 detik,
menghitung status berdasarkan ambang batas, dan memaksa relay mati saat overload meskipun ada
perintah `FORCE_ON` dari server.

## Troubleshooting MQTT offline

Indikator di header dulu hanya mengikuti bridge server, sehingga bisa offline walaupun ESP32 aktif.
Sekarang indikator memakai status koneksi browser bila bridge server gagal, dan detail kedua koneksi
ditampilkan di `/settings`. Penyebab umum bridge offline:

- Port TCP 1883 diblokir jaringan/ISP → bridge otomatis memakai `wss://broker.hivemq.com:8884/mqtt`.
- `MQTT_BROKER_URL` ditulis tanpa skema (`broker.hivemq.com:1883`) → sudah dinormalisasi jadi `mqtt://...`.
- Broker lokal dipakai tetapi WS belum diaktifkan → set `MQTT_BRIDGE_URL` ke alamat WS Mosquitto.

Pesan error terakhir dari bridge tampil di `/settings → Koneksi MQTT`.

Tombol Aktifkan/Matikan motor **tidak mengirim perintah lewat browser**, melainkan lewat bridge server.
Kalau `Status server` offline, perintah hanya masuk antrean (`QUEUED`) dan ESP32 tidak menerima apa pun
(ciri khas: tidak ada log `MQTT Command: ...` di Serial Monitor). Antrean akan dikirim otomatis saat
broker tersambung, dan jumlahnya tampil di `/settings → Perintah antrean`. Setelah mengubah `.env`
atau kode bridge, **restart `npm run dev`** — state bridge lama disimpan di `globalThis` sehingga
proses lama tidak memakai konfigurasi baru.

## Verifikasi

```bash
npm run lint
npm run typecheck
npm run build
```

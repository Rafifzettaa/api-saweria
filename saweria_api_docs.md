# Saweria API Documentation

## Overview
API ini menyediakan layanan untuk integrasi dengan platform donasi Saweria, termasuk pembuatan QRIS payment, pengecekan status pembayaran, dan pengecekan saldo akun.

## Base URL
```
http://localhost:3000
```

## Authentication
- Endpoint `/qris` dan `/status/:donationId` tidak memerlukan autentikasi
- Endpoint `/balance` memerlukan Bearer token yang dikirim sebagai query parameter

## Endpoints

### 1. Generate QRIS Payment

**Endpoint:** `POST /qris`

**Description:** Membuat QRIS payment untuk donasi dengan jumlah tertentu

**Request Body:**
```json
{
  "amount": 10000,
  "userId": "saweria_user_id"
}
```

**Parameters:**
- `amount` (number, required): Jumlah donasi dalam IDR
- `userId` (string, required): ID pengguna Saweria

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "donation_id",
    "qr_string": "qris_string_data",
    "qr_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "amount": 10000,
    "currency": "IDR",
    "created_at": "2025-01-15T10:30:00Z",
    "expires_at": "2025-01-15T10:45:00Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Amount and userId are required"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3000/qris \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "userId": "your_saweria_user_id"
  }'
```

### 2. Check Payment Status

**Endpoint:** `GET /status/:donationId`

**Description:** Mengecek status pembayaran berdasarkan donation ID

**Parameters:**
- `donationId` (string, required): ID donasi yang ingin dicek statusnya

**Response Success (200):**
```json
{
  "success": true,
  "status": "PENDING", // atau "PAID"
  "data": {
    "id": "donation_id",
    "amount": 10000,
    "currency": "IDR",
    "status": "pending",
    "qr_string": "qris_string_data", // null jika sudah dibayar
    "paid_at": null, // timestamp jika sudah dibayar
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Invalid response structure"
}
```

**Example cURL:**
```bash
curl -X GET http://localhost:3000/status/donation_id_here
```

### 3. Check Account Balance

**Endpoint:** `GET /balance`

**Description:** Mengecek saldo akun Saweria menggunakan bearer token

**Query Parameters:**
- `token` (string, required): Bearer token untuk autentikasi

**Response Success (200):**
```json
{
  "success": true,
  "balance": {
    "available": 150000,
    "pending": 25000,
    "currency": "IDR",
    "last_updated": "2025-01-15T10:30:00Z"
  }
}
```

**Response Error (400):**
```json
{
  "success": false,
  "error": "Token is required"
}
```

**Example cURL:**
```bash
curl -X GET "http://localhost:3000/balance?token=your_bearer_token_here"
```

## Error Handling

API ini menggunakan HTTP status codes standar:
- `200`: Success
- `400`: Bad Request (parameter tidak valid atau missing)
- `500`: Internal Server Error

Semua error response mengikuti format:
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Payment Flow

1. **Generate QRIS**: Panggil endpoint `POST /qris` dengan amount dan userId
2. **Display QR Code**: Tampilkan QR code dari field `qr_image` kepada user
3. **Check Status**: Polling endpoint `GET /status/:donationId` untuk mengecek status pembayaran
4. **Payment Complete**: Status berubah dari "PENDING" ke "PAID" ketika pembayaran selesai

## Implementation Notes

### QR Code Generation
- QR code dibuat menggunakan library `qrcode` dengan error correction level "H"
- Format output: Data URL dengan format PNG (300px width)
- QR code berisi QRIS string yang dapat dibaca oleh aplikasi mobile banking

### Payment Status Logic
- Status "PENDING": `qr_string` masih ada dalam response
- Status "PAID": `qr_string` bernilai null atau tidak ada

### Rate Limiting
- Tidak ada rate limiting yang diimplementasikan dalam kode ini
- Disarankan untuk menambahkan rate limiting di production

## Security Considerations

1. **Bearer Token**: Simpan token dengan aman dan jangan expose di client-side
2. **HTTPS**: Gunakan HTTPS di production environment
3. **Input Validation**: Validasi input amount untuk mencegah nilai negatif atau terlalu besar
4. **Environment Variables**: Simpan konfigurasi sensitif di environment variables

## Dependencies

```json
{
  "express": "^4.x.x",
  "body-parser": "^1.x.x",
  "node-fetch": "^3.x.x",
  "qrcode": "^1.x.x"
}
```

## Installation & Setup

1. Clone repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the server:
   ```bash
   npm start
   ```
4. Server akan berjalan di `http://localhost:3000`

## Testing

Untuk testing API, Anda dapat menggunakan:
- Postman
- cURL commands (seperti contoh di atas)
- Thunder Client (VS Code extension)

## Support

Untuk pertanyaan atau issues, silakan hubungi developer atau buat issue di repository.
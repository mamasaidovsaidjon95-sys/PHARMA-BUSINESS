PHARMA BUSINESS v25 — YETKAZIB BERUVCHILAR VA XARID HISOBI

YANGILIKLAR
- Firma doirasida yetkazib beruvchilar katalogi (nomi, mas’ul, telefon, manzil, izoh).
- Xarid buyurtmasini qoralama sifatida yaratish.
- Xarid tarkibida mahsulot, miqdor, xarid narxi, partiya raqami, ishlab chiqarilgan va yaroqlilik sanasi.
- Xaridni qabul qilishda transaction ichida inventory_batches va stock_movements ga avtomatik kirim.
- Yetkazib beruvchiga naqd, o‘tkazma yoki karta to‘lovini qayd etish.
- Yetkazib beruvchi va xarid hujjati kesimida xarid, to‘langan summa va qoldiq qarz.
- Firma (tenant) bo‘yicha ma’lumotlar ajratilgan.

O‘RNATISH
1. PostgreSQL bazasini sozlang (.env.example yoki README_UZ.txt ko‘rsatmasiga qarang).
2. Migrations 001–013 avvalgi tartibda bajarilgan bo‘lishi kerak.
3. 014_v25_procurement.sql migratsiyasini bir marta bajaring.
4. npm install va npm start.
5. Administrator yoki menejer bilan kiring, Xaridlar bo‘limidan yetkazib beruvchi qo‘shing.

API (Bearer JWT)
GET/POST /api/suppliers
PATCH /api/suppliers/:id
GET/POST /api/purchases
GET /api/purchases/:id
POST /api/purchases/:id/receive
POST /api/suppliers/:id/payments
GET /api/suppliers/:id/statement

MUHIM CHEGARALAR
- Joriy UI bitta mahsulot qatorli xarid hujjatini yaratadi; API 500 tagacha qator qabul qiladi.
- Xarid hujjatini qabul qilish real ombor partiyasi va kirim harakatini yozadi. Qoralama hujjat ombor qoldig‘iga ta’sir qilmaydi.
- Yetkazib beruvchiga to‘lov hozircha ichki hisob registriga yoziladi; bank, Click, Payme yoki kassa bilan pul o‘tkazmaydi.
- Yetkazib beruvchi qarzi qabul qilingan xaridlar minus qayd qilingan to‘lovlar sifatida hisoblanadi; xarid qaytarish/credit-note jarayoni bu versiyada yo‘q.
- PostgreSQL integratsion test, real hosting/deployment, Android APK va iOS IPA yig‘ilmagan. Sintaksis va ZIP yaxlitligi tekshirildi.
- Ishlab chiqarishdan oldin migratsiyalarni backup bilan sinov bazasida tekshiring, ruxsatlar va farmatsevtika/soliq hujjatlari talablarini mahalliy mutaxassis bilan tasdiqlang.

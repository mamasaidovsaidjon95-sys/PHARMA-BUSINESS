PHARMA BUSINESS v26 — XARID QAYTARISH VA YETKAZIB BERUVCHI DALOLATNOMASI

YANGILIKLAR
- Qabul qilingan xarid hujjatidan mahsulotni qisman qaytarish.
- Qaytarish miqdori avvalgi qaytarishlar bilan tekshiriladi.
- Partiyada real mavjud qoldiq tekshiriladi; yetarli bo‘lmasa qaytarish rad etiladi.
- Qaytarilgan miqdor stock_movements orqali ombordan chiqariladi.
- Yetkazib beruvchi dalolatnomasida xaridlar, qaytarishlar va to‘lovlar bitta vaqt chizig‘ida ko‘rsatiladi.
- Dalolatnomani brauzer Chop etish / PDF sifatida saqlash mumkin.
- v25 xarid hujjati allaqachon 500 tagacha mahsulot qatorini qabul qiladi; UI v25 da bitta qator kiritardi. v26 API ko‘p qatorni qo‘llaydi, interfeys esa hozircha mavjud bir qatorli shaklni saqlaydi.

O‘RNATISH
1. v25 loyihasini zaxiralang.
2. migrations/015_v26_purchase_returns.sql migratsiyasini 001–014 dan keyin bajaring.
3. Fayllarni serverga joylang, npm install va npm start.

CHEKLOVLAR
- Dalolatnoma hisob-kitob hisobotidir; elektron raqamli imzo yoki soliq hujjati emas.
- Yetkazib beruvchiga pul qaytarish yoki bank tranzaksiyasi avtomatik amalga oshmaydi.
- PostgreSQL integratsion sinovi va real server deploy bajarilmagan.
- PDF brauzerning chop etish oynasi orqali yaratiladi.

PHARMA BUSINESS v23 — FEFO, qaytarish va yaroqsiz mahsulotlar nazorati

YANGILIKLAR
- Buyurtma jo‘natilayotganda partiyali zaxiradan FEFO tartibida (yaroqlilik muddati eng yaqinidan) avtomatik yechiladi.
- Muddati o‘tgan partiya sotuv uchun hisobga olinmaydi.
- Partiyali mahsulotlarda yetarli yaroqli zaxira bo‘lmasa, jo‘natish tranzaksiya bilan bekor qilinadi.
- Har bir buyurtma-partiya taqsimoti audit uchun saqlanadi.
- Qisman qaytarish: POST /api/orders/:id/returns; qaytarish sababi majburiy.
- Qaytarilgan mahsulot dastlabki partiyasiga qaytariladi. Agar partiya muddati o‘tgan bo‘lsa, u FEFO sotuviga kirmaydi.
- Qaytarishlar tarixi: GET /api/orders/:id/returns.

O‘RNATISH
1. v22 dagi barcha oldingi migratsiyalar (001–011) bajarilgan bo‘lsin.
2. migrations/012_v23_fefo_returns.sql ni PostgreSQL bazasida bir marta bajaring.
3. .env ni sozlang va npm install hamda npm start buyrug‘ini bajaring.
4. Mavjud partiyasiz stock_movements qoldiqlari avvalgidek ishlaydi; partiyali mahsulotlarda FEFO qo‘llanadi.

MUHIM CHEGARALAR
- FEFO zaxira yechimi buyurtma holati 'shipped' bo‘lganda ishlaydi.
- Partiyali mahsulotni qaytarish uchun dastlabki jo‘natish v23 dan keyin amalga oshirilgan bo‘lishi kerak; eski buyurtmalarda taqsimot yozuvi bo‘lmaydi.
- Qaytarish moliyaviy refundni avtomatik amalga oshirmaydi; bu endpoint faqat ombor qabulini qayd etadi.
- Muddati o‘tgan qaytarilgan mahsulot alohida karantin/yo‘q qilish jarayoniga chiqarilishi kerak. Hozir u FEFO savdosiga kiritilmaydi.
- PostgreSQL integratsion sinovi, server deploy, APK/IPA build bajarilmagan. Ishlab chiqarishdan oldin backup, rollar, farmatsevtika qonunchiligi va hisob-faktura talablari tekshirilsin.

v24 qo‘shimchasi: karantin, hisobdan chiqarish va pul qaytarish ledgeri uchun 013 migratsiya hamda README_V24_UZ.txt ga qarang.

PHARMA BUSINESS v18 — OBUNA TO‘LOVLARI

YANGILIKLAR
- Platform operatori obuna to‘lovlarini qo‘lda qayd etishi mumkin.
- To‘lovlar tarixi: firma, sana, summa, usul, referens va izoh.
- To‘lovni kiritishda ixtiyoriy tarif belgilash va obunani 1–3650 kunga uzaytirish mumkin.
- To‘lovlar UZS valyutasida yuritiladi.

O‘RNATISH
1. Avvalgi versiyadagi .env sozlamalari saqlanadi.
2. 001 dan 008 gacha migratsiyalarni ketma-ket bajaring.
3. npm install va npm start.
4. HTTPS orqali /platform-admin.html sahifasini oching.

MUHIM CHEKLOVLAR
- To‘lovlar operator tomonidan qo‘lda qayd etiladi; bank, Click, Payme yoki boshqa gateway integratsiyasi yo‘q.
- Kiritilgan to‘lov yozuvi pul o‘tkazmasining mustaqil tasdig‘i emas.
- PostgreSQL integratsion testlari va production deployment bajarilmagan.
- Production uchun platform operatorining alohida autentifikatsiyasi, rate-limit, audit, backup va xavfsizlik auditi zarur.

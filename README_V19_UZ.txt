PHARMA BUSINESS v19 — MOLIYAVIY HISOBOT

YANGILIKLAR
- Platform obuna tushumlari: jami, joriy yil va joriy oy.
- Oxirgi 12 oy bo‘yicha oyma-oy tushumlar.
- Firma kesimida jami to‘lov, shu oy to‘lovi, tarif va obuna tugashigacha qolgan kunlar.
- Firma kesimidagi moliyaviy hisobotni CSV formatida yuklab olish.

O‘RNATISH
1. Avvalgi v18 loyihasining fayllarini v19 bilan almashtiring.
2. Avvalgi migratsiyalar 001–008 bajarilgan bo‘lishi kerak. v19 uchun yangi DB migratsiyasi talab qilinmaydi.
3. .env faylida DATABASE_URL, kamida 32 belgili JWT_SECRET va maxfiy BOOTSTRAP_SECRET bo‘lsin.
4. npm install va npm start.
5. /platform-admin.html sahifasini oching va BOOTSTRAP_SECRET kiriting.

MUHIM CHEGARALAR
- Hisobot faqat platform_subscription_payments jadvalidagi qo‘lda qayd qilingan obuna tushumlarini hisoblaydi.
- Bu bank, Click, Payme yoki soliq tizimi bilan avtomatik integratsiya emas.
- Hisobot foyda yoki buxgalteriya balansi emas; xarajatlar, soliq va bank komissiyalari hisoblanmaydi.
- Ushbu muhitda PostgreSQL integratsion test yoki internetga deployment bajarilmadi.
- Tijoriy ishga tushirishdan oldin xavfsizlik auditi, zaxira nusxa, monitoring va real DB sinovlari zarur.

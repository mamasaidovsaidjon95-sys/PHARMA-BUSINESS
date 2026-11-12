PHARMA BUSINESS v17 — PLATFORM ADMIN

YANGILIKLAR
- Platform administrator panelida barcha firmalarni ro‘yxatlash.
- Firma va uning birinchi administratorini yaratish.
- Firma tarifini (trial/basic/standard/pro) o‘zgartirish.
- Firma holatini (trial/active/suspended/expired) boshqarish.
- Tarif muddati kunlarda beriladi (0–3650).
- Firmalarni tasodifan o‘chirib yubormaslik uchun hard-delete funksiyasi yo‘q.

ISHGA TUSHIRISH
1. .env faylida DATABASE_URL va kamida 32 belgili JWT_SECRET kiriting.
2. BOOTSTRAP_SECRET uchun uzun, tasodifiy maxfiy kalit belgilang. Uni hech kimga oshkor qilmang.
3. README_UZ.txt dagi PostgreSQL migratsiyalarini 001 dan 007 gacha tartib bilan bajaring.
4. npm install va npm start.
5. HTTPS orqali /platform-admin.html sahifasini oching va BOOTSTRAP_SECRET kiriting.

XAVFSIZLIK
- Platform endpointlari x-bootstrap-secret header orqali himoyalangan. Kalit frontend kodiga yozilmagan.
- Kalitni brauzer sessionStorage ichida saqlash qulaylik uchun; umumiy qurilmada ishlatgandan keyin sessiyani yoping.
- Real tijoriy ishga tushirishdan oldin platform admin uchun alohida operator autentifikatsiyasi, rate limit, audit log, backup va xavfsizlik auditi zarur.
- Bu versiya PostgreSQL integratsion sinovi yoki production deploymentdan o‘tmagan.

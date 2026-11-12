PHARMA BUSINESS v20 — SAVDO MAQSADLARI VA NATIJALAR

Yangi imkoniyatlar:
- Savdo vakili bo‘yicha kunlik savdo maqsadi (so‘m) belgilash.
- Sana bo‘yicha haqiqiy savdo va maqsad bajarilishi foizi.
- Savdo vakillari reytingi va buyurtmalar soni.
- Savdo vakili faqat o‘z natijasini ko‘radi; firma administratori va menejerlar umumiy reytingni ko‘radi.
- Buyurtma muallifi (created_by) bo‘yicha savdo hisoblanadi; bekor qilingan buyurtmalar hisobga olinmaydi.

O‘rnatish:
1. PostgreSQL bazasida avvalgi 001–008 migratsiyalar bajarilgan bo‘lsin.
2. Yangi 009_v20_sales_targets.sql migratsiyasini bajaring.
3. npm install va .env sozlamalaridan so‘ng npm start.

Cheklovlar:
- Hisobot buyurtma yaratilgan xodimga savdoni biriktiradi; buyurtmani boshqa rol yaratgan bo‘lsa, savdo vakiliga avtomatik biriktirilmaydi.
- Maqsadlar kunlik; oylik kvota va real-time push hali yo‘q.
- PostgreSQL integratsion test, hosting/deployment, Android APK va iOS IPA ushbu ZIP ichida bajarilmagan.
- Ishlab chiqarishdan oldin zaxira nusxa, xavfsizlik auditi va mahalliy talablarni tekshiring.

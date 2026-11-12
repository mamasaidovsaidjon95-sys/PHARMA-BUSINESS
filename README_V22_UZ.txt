PHARMA BUSINESS v22 — PARTIYA VA YAROQLILIK MUDDATI NAZORATI

Yangi imkoniyatlar:
- Mahsulot kirimini partiya/seriya raqami bo‘yicha qayd etish.
- Ishlab chiqarilgan sana, yaroqlilik muddati, yetkazib beruvchi, miqdor va kirim tannarxini saqlash.
- Partiya qoldig‘ini unga bog‘langan ombor harakatlari orqali hisoblash.
- 90 kun ichida muddati tugaydigan va muddati o‘tgan partiyalarni ko‘rsatish.
- Barcha ma’lumotlar firma (tenant) doirasida ajratilgan.

O‘rnatish:
1. Avvalgi 001–010 migratsiyalar bajarilgan bazada 011_v22_inventory_batches.sql ni bajaring.
2. ZIP ichidagi loyiha papkasida npm install bajaring.
3. .env faylida DATABASE_URL, kamida 32 belgili JWT_SECRET va zarur sozlamalarni kiriting.
4. npm start bilan ishga tushiring.

MUHIM CHEKLOVLAR:
- Eski, partiyasiz stock_movements yozuvlari umumiy ombor qoldig‘ida qoladi; ular uchun partiya/yaroqlilik sanasi avtomatik tiklanmaydi.
- Eski umumiy kirim/chiqim formasi ham saqlangan. Partiya nazorati kerak bo‘lgan yangi kirimlarni “Partiya bo‘yicha kirim” orqali kiriting.
- Buyurtma jo‘natishdagi mavjud ombor kamaytirish jarayoni hali FEFO (muddati eng yaqin partiyadan avtomatik chiqarish) qilmaydi va muddati o‘tgan partiyani sotishni bloklamaydi. Bu versiya partiyalar va ogohlantirishlarni kuzatadi, lekin to‘liq farmatsevtik FEFO nazorati emas.
- PostgreSQL integratsion test, hosting/deployment, Android APK va iOS IPA ushbu ZIP ichida bajarilmagan.
- Ishlab chiqarishdan oldin backup, xavfsizlik va O‘zbekistonning amaldagi dori vositalari, hisob-faktura hamda ma’lumotlarni himoya qilish talablarini mutaxassis bilan tekshiring.

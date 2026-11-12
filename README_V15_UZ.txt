PHARMA BUSINESS v15

YANGILIK:
- CSV orqali mahsulotlarni ommaviy import qilish.
- CSV fayl tizim tomonidan 500 tadan bo'lib yuboriladi; bu faqat bitta HTTP so'rov hajmi chegarasi, umumiy katalog soni limiti emas.
- Takroriy SKU/shtrix-kodlar importda o'tkazib yuboriladi.
- Mahsulotlar soniga dasturiy umumiy limit qo'yilmagan. Amaliy sig'im PostgreSQL va server resurslariga bog'liq.

CSV sarlavha ustunlari:
name,sku,barcode,manufacturer,unit,purchasePrice,salePrice
Majburiy: name, purchasePrice, salePrice. Matn maydonlaridagi vergul bo'lsa, CSV standartiga muvofiq qo'shtirnoq ichiga oling.

O'RNATISH:
1. ZIPni oching.
2. npm install
3. .env faylda DATABASE_URL va kamida 32 belgili JWT_SECRET kiriting.
4. Mavjud migratsiyalarni 001 dan 007 gacha ketma-ket bajaring (v14 dagi kabi).
5. npm start

Eslatma: Bu MVP manba kodi. PostgreSQL integratsion sinovi, real hosting/deploy, Android APK va iOS IPA build ushbu paket doirasida bajarilmadi. Importni avval test bazasida sinab ko'ring va zaxira nusxa oling.

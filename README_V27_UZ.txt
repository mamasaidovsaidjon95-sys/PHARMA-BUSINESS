PHARMA BUSINESS v27 — xarid importi va narxlar tarixi

YANGILIKLAR
1) Xaridlar bo‘limida Excel’dan CSV UTF-8 qilib saqlangan faylni import qilish.
2) CSV ustunlari: barcode, quantity, unitCost, batchNumber, expiryDate; manufactureDate ixtiyoriy.
3) Bir importda 500 tagacha mahsulot qatori. Shtrix-kod mahsulotlar bazasida oldindan bo‘lishi shart.
4) Import qoralama xarid yaratadi; omborga kirim qilish uchun xaridlar ro‘yxatida “Kirimni tasdiqlash” bosing.
5) Har bir qabul qilingan xarid bo‘yicha mahsulot, yetkazib beruvchi, sana, miqdor va birlik xarid narxi tarixi saqlanadi.
6) Mahsulot kartochkasi uchun xarid narxining tarixini ko‘rish mumkin; joriy purchase_price oxirgi qabul qilingan xarid narxiga yangilanadi.

O‘RNATISH
Avval 001–015 migratsiyalarni bajargan bo‘ling. So‘ng migrations/016_v27_purchase_price_history.sql ni PostgreSQL’da bir marta bajaring. Keyin npm install va npm start.

CSV NAMUNA
barcode,quantity,unitCost,batchNumber,expiryDate,manufactureDate
4780000000012,100,12500,LOT-001,2027-12-31,2025-12-01

CHEGARALAR VA ESLATMA
Bu versiya .xlsx binar faylni to‘g‘ridan-to‘g‘ri o‘qimaydi; Excel’da CSV UTF-8 formatida eksport qilingan faylni qabul qiladi. Har bir shtrix-kod firma mahsulotlari jadvalidagi barcode maydoniga mos kelishi kerak. Import qoralama yaratadi, omborni faqat qabul qilish tasdiqlaydi. PostgreSQL integratsion test, real server deploy va mobil APK/IPA build bajarilmagan.

ILOVA SIFATIDA O‘RNATISH (PWA)
Ushbu paket PWA ko‘rinishida tayyorlandi: Android, iPhone/iPad va Windows/macOS brauzerlarida bosh ekranga/ilovalar ro‘yxatiga qo‘shish mumkin.
1) Ilovani internetga ochiq serverga joylashtiring va domen uchun HTTPS sertifikat yoqing. PWA o‘rnatish hamda kamera/GPS kabi imkoniyatlar uchun HTTPS talab qilinadi (localhost bundan mustasno).
2) Android: Chrome’da domenni oching → menyu → “Install app / Ilovani o‘rnatish” yoki “Add to Home screen”.
3) iPhone/iPad: Safari’da domenni oching → Share/Ulashish → “Add to Home Screen / Bosh ekranga qo‘shish”.
4) Windows: Microsoft Edge’da domenni oching → Settings and more → Apps → Install this site as an app.
5) Kompyuterda ham brauzer orqali ishlaydi.

MUHIM TEXNIK CHEGARALAR
- Bu PWA: native APK/AAB yoki iOS IPA fayli emas. Google Play/App Store’ga joylash uchun keyinchalik alohida native wrapper, signing va store jarayonlari kerak.
- PWA shell sahifasi va ikonkalari keshlangan bo‘ladi. Savdo, ombor va buyurtma API amallari server/internet talab qiladi; to‘liq offline rejim va fon sinxronlash kafolatlanmaydi.
- Ishlab chiqarishdan oldin HTTPS domen, PostgreSQL backup, maxfiy kalitlar, monitoring va xavfsizlik tekshiruvlari sozlanishi shart.

PHARMA BUSINESS v28 — SAYT + ISHCHI WEB-KABINET

NIMA O'ZGARDI
- / manzilida PHARMA BUSINESS tanishtiruv sayti ochiladi.
- /app manzilida v27 ishchi boshqaruv kabineti ochiladi (login talab qiladi).
- Bitta domen orqali tanishtiruv sayti va ishchi platforma ishlaydi.
- PWA manifest /app ni asosiy o'rnatiladigan ilova sifatida ochadi.
- Service Worker / va /app sahifalarini alohida keshlaydi; /api so'rovlari keshga olinmaydi.
- Bosh sahifadan tizimga kirish tugmalari ishchi kabinetga olib boradi.

ISHCHI KABINETDA MAVJUD MODULLAR (BACKEND + UI)
- Kompaniya va foydalanuvchi login/ro'yxatdan o'tish, rollar va kompaniya ma'lumotlarini ajratish.
- Mahsulotlar katalogi, dorixonalar, ombor kirim-chiqimi, shtrix-kod qidiruvi/skaneri.
- Buyurtmalar, savdo, to'lovlar, naqd/karta/o'tkazma va nasiya qarzdorligi.
- Partiya/seriya, yaroqlilik muddati, FEFO, karantin, hisobdan chiqarish.
- Mijoz qaytarishi va pul qaytarish qaydlari.
- Yetkazib beruvchilar, xarid buyurtmalari, xarid qaytarishlari, solishtirma hisob.
- CSV importi (Excel'dan CSV UTF-8 eksport qilingan fayl), xarid narxlari tarixi.
- Savdo vakili kunlik/oylik rejasi va komissiya/bonus ko'rsatkichlari.
- Yetkazib berish holati, savdo tashriflari uchun rozilik asosida GPS qaydi.
- Hisobotlar, audit tarixi va platforma obuna/billing boshqaruvi.

O'RNATISH / ISHGA TUSHIRISH
1. Linux serverda Docker va Docker Compose o'rnating.
2. .env.example nusxasini .env qiling. DATABASE_URL, JWT_SECRET (kamida 32 belgi), BOOTSTRAP_SECRET va PGSSL sozlamalarini xavfsiz qiymatlar bilan to'ldiring.
3. docker-compose.yml dagi POSTGRES_PASSWORD ni kuchli maxfiy parolga almashtiring; hech qachon change_me bilan internetga chiqarmang.
4. Bazani ishga tushiring: docker compose up -d db.
5. migrations/001_init.sql dan migrations/016_v27_purchase_price_history.sql gacha ketma-ket bir martadan bajaring. Masalan: for f in migrations/*.sql; do docker compose exec -T db psql -U pharma -d pharma_business < "$f"; done (DB user/parol mosligini tekshiring).
6. API ni ishga tushiring: docker compose up -d --build api.
7. Caddy yoki boshqa reverse proxy orqali domen va HTTPS ulang. API konteynerining 8080 portini ommaga bevosita ochmang; HTTPS reverse proxy orqali yo'naltiring.
8. https://SIZNING-DOMEN.UZ/ — tanishtiruv sayti; https://SIZNING-DOMEN.UZ/app — ishchi kabinet.

PWA O'RNATISH
- Android: Chrome > domen > menyu > Install app / Add to Home screen.
- iPhone: Safari > domen > Share > Add to Home Screen.
- Windows/macOS: Edge/Chrome menyusi > Install app.
- Buning uchun HTTPS zarur.

MUHIM CHEGARALAR
- Bu web ilova/PWA; native APK/AAB yoki iOS IPA emas.
- Excel .xlsx binar faylini to'g'ridan-to'g'ri import qilish yo'q; CSV UTF-8 orqali import bor.
- To'liq offline savdo va avtomatik fon sinxronlash kafolatlanmaydi. Kesh faqat sahifa qobig'i uchun.
- Click/Payme/bank API, real pul o'tkazmasi, elektron hisob-faktura/ERI va davlat tizimlari integratsiyasi yo'q.
- PostgreSQL integratsion test, xavfsizlik auditi va real server deploy ushbu paketda bajarilmagan.
- Ishlab chiqarishdan oldin O'zbekiston farmatsevtika, shaxsiy ma'lumotlar, soliq va elektron hujjatlar talablarini mutaxassis bilan tekshiring.
- Cheklanmagan katalog uchun ilova darajasida sun'iy mahsulot limiti qo'yilmagan; amaliy sig'im server va PostgreSQL resurslariga bog'liq.

XAVFSIZLIK
- .env, parollar, JWT_SECRET va BOOTSTRAP_SECRET ni hech kimga yubormang.
- DB backup, monitoring, firewall, HTTPS, yangilanish va tiklash sinovlarini yoqing.
- Birinchi ishga tushirishdan oldin kompaniya admin hisobini yaratish bo'yicha README_UZ.txt dagi amaldagi API yo'riqnomasini tekshiring.

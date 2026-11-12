PHARMA BUSINESS v11 — INTEGRATED MVP

v9 imkoniyatlari saqlangan: firmalararo savdo so'rovlari, mahsulot shtrix-kodi qidiruvi, buyurtmalar yetkazib berish nazorati, kuryer va kuzatuv kodi.

v10 YANGILIKLARI
- Mahsulotlar ro'yxatini Excel dasturida ochiladigan CSV formatida eksport qilish.
- Buyurtmalar tarixini CSV formatida eksport qilish.
- Har bir buyurtma uchun chek ko'rinishini ochish, chop etish yoki brauzer orqali PDF sifatida saqlash.
- Chekda mahsulotlar, miqdor, narx, jami, to'langan va qolgan summa ko'rsatiladi.
- Chek rasmiy elektron hisob-faktura emas; soliq/e-hisob-faktura provayderiga ulanmagan.

v11 YANGILIKLARI
- Savdo vakili tashrifini faqat foydalanuvchi tugmani bosib GPS ruxsatini berganida qayd etish. Fon rejimida kuzatuv yo'q.
- Tashrifda dorixona, vaqt, koordinata, GPS aniqligi, xodim va izoh saqlanadi. Savdo vakili faqat o'z tashriflarini, firma administratori/menejeri esa firma tashriflarini ko'radi.
- PWA manifest va service worker: avval ochilgan ilova qobig'i internet uzilganda ochilishi mumkin. API ma'lumotlari offline saqlanmaydi va yozuvlar navbatga olinmaydi.
- GPS geolokatsiya uchun HTTPS talab qilinadi (localhost istisno).

O'RNATISH
1. ZIP arxivni oching.
2. .env.example faylidan .env yarating va DATABASE_URL hamda kamida 32 belgili JWT_SECRET kiriting.
3. PostgreSQL bazasida quyidagi migratsiyalarni tartib bilan bajaring:
   migrations/001_init.sql
   migrations/002_subscriptions.sql
   migrations/003_security_audit_users.sql
   migrations/004_b2b_trade.sql
   migrations/005_v9_delivery_barcode.sql
   migrations/006_v11_sales_visits.sql
4. Node.js 20 yoki undan yangisini o'rnating.
5. npm install
6. npm start
7. Brauzerda server manzilini oching.

CHEK / PDF
Buyurtmalar tarixida "Chek / PDF" tugmasini bosing. Ochilgan oynada "Chop etish / PDF saqlash" ni tanlang. Mobil brauzerda popup oynalarga ruxsat kerak bo'lishi mumkin.

CSV EKSPORT
Dorilar yoki buyurtmalar sahifasidagi eksport tugmasi CSV fayl yaratadi. Excel'da ochish mumkin; bu eksport rasmiy buxgalteriya integratsiyasi emas.

MUHIM CHEKLOVLAR
Bu sinov uchun MVP manba kodi, tayyor hosting yoki do'konga joylangan ilova emas. Android APK va iOS IPA buildlari yaratilmagan. To'liq PostgreSQL integratsion testlari, HTTPS, zaxira nusxa, monitoring, pentest, email tasdiqlash, parolni tiklash, to'lov provayderi, elektron hisob-faktura integratsiyasi, kamera orqali QR skanerlash, GPS tashrif jurnali v11 da bor, ammo faqat foydalanuvchi bosgan paytdagi foreground geolocation. To'liq offline ma'lumotlar sinxronlash va yozuvlar navbati hali bajarilmagan. Kamera orqali QR skanerlash ham mavjud emas. Ishlab chiqarishdan oldin xavfsizlik auditi va O'zbekistonning farmatsevtika, shaxsiy ma'lumot, soliq va elektron hujjat talablarini mutaxassis bilan tekshirish zarur.


PHARMA BUSINESS v12 qo‘shimchalari:
- Offline holatda buyurtma formasi yuborilsa, buyurtma brauzer localStorage navbatiga saqlanadi. Internet qaytgach, foydalanuvchi navbatni yuborishi mumkin. Qurilma/brauzer ma’lumotlari tozalansa navbat yo‘qolishi mumkin; bu hali to‘liq offline-first ombor sinxronizatsiyasi emas.
- Mos Chromium brauzerlarida BarcodeDetector API orqali kamera bilan EAN/QR skanerlash. Qo‘llab-quvvatlanmagan brauzerlarda qo‘lda yoki USB/Bluetooth skaner ishlatiladi. Kamera uchun HTTPS talab qilinadi.
- Offline buyurtmalarni yuborishda server javob bermagan holatda takroriy yuborish xavfi mavjud; ishlab chiqarishdan oldin server tomonda idempotency kaliti qo‘shilishi shart.


PHARMA BUSINESS v13 — TAKRORIY BUYURTMADAN HIMOYA
=================================================
Yangi migratsiya: migrations/007_v13_order_idempotency.sql
8. 008_v18_subscription_payments.sql
Migratsiyalarni 001 dan 007 gacha ketma-ket bajaring.

v13 da buyurtmalar uchun idempotencyKey qo‘shildi. Brauzer bir xil
buyurtmani aloqa uzilishi sabab qayta yuborsa, server bir xil kalit
bo‘yicha ikkinchi savdo yozuvini yaratmaslikka harakat qiladi. Offline
navbatdagi buyurtma o‘z kalitini saqlab qoladi va qayta yuborishda ham
o‘sha kalitdan foydalanadi. Eski API mijozlari kalitsiz ishlashda davom etadi.

CHEKLOVLAR:
- Offline navbat hozircha shu brauzer/qurilmaning localStorage xotirasida.
  Ilova ma’lumotlari tozalansa yoki boshqa qurilmaga o‘tilsa, navbat yo‘qolishi mumkin.
- Offline rejimda mahsulot/dorixona katalogi to‘liq keshlangan emas.
- Idempotency bir xil kalit bilan takror yuborilgan buyurtmani himoya qiladi;
  foydalanuvchi ataylab yangi kalit yaratib qayta buyurtma bersa, bu yangi buyurtma bo‘ladi.
- PostgreSQL integratsion va ko‘p foydalanuvchili yuklama sinovlari bajarilmagan.
- Bu MVP ishlab chiqarish muhitiga tayyor deb hisoblanmaydi. Deploy, TLS,
  zaxira nusxa, monitoring, xavfsizlik auditi va qonunchilik tekshiruvi zarur.


PHARMA BUSINESS v14 — MAHSULOTLAR SONI CHEKLANMAGAN
=================================================
- Firma katalogiga mahsulot qo'shish uchun dastur darajasida dona/mahsulotlar soni limiti qo'yilmagan.
- Bitta buyurtmaga ham 200 ta mahsulot qatori bilan cheklash olib tashlandi.
- Mahsulotning ombor miqdori ham musbat kasr/son ko'rinishida kiritiladi; dastur tomonidan yuqori chegara belgilanmagan.
- Amaliy sig'im server diski, PostgreSQL resurslari va hosting tarifiga bog'liq. Juda katta kataloglarda tezlikni saqlash uchun keyingi bosqichda sahifalash (pagination), qidiruv va indekslar kerak bo'ladi.
- Eski v13 bazasidan yangilash uchun yangi SQL migratsiyasi talab qilinmaydi; mavjud 001–007 migratsiyalar saqlanadi.


PHARMA BUSINESS v18 — OBUNA TO‘LOVLARI
- Platform admin panelida qo‘lda qayd etilgan obunaviy to‘lovlar tarixi.
- Firma, summa (UZS), to‘lov usuli, chek/referens va izoh saqlanadi.
- To‘lov qaydida ixtiyoriy ravishda tarif va obuna muddatini uzaytirish mumkin.
- Bu bank/to‘lov provayderi bilan integratsiya emas: pul tushgani tashqi tizimdan tasdiqlanmaydi. Operator faqat tekshirilgan to‘lovni qo‘lda kiritishi kerak.


V19: platform administratorida obuna tushumlari bo‘yicha 12 oylik tahlil, firma kesimidagi to‘lovlar va CSV eksport mavjud. Batafsil: README_V19_UZ.txt.


v20: 009_v20_sales_targets.sql migratsiyasini ham bajaring. Tafsilot: README_V20_UZ.txt.

PHARMA BUSINESS v21 — OYLIK REJA VA RAG‘BATLANTIRISH
1. Avvalgi 001–009 migratsiyalar bajarilgan bazada migrations/010_v21_monthly_compensation.sql ni bajaring.
2. Serverni yangilang va qayta ishga tushiring.
3. Firma administratori yoki menejer Savdo bo‘limida oylik savdo rejasini, komissiya foizini, bonus summasini va bonus chegarasini belgilaydi.
4. Oylik hisobotda savdo, reja bajarilishi, taxminiy komissiya va bonus ko‘rinadi. Savdo vakili faqat o‘z natijasini ko‘radi.

Hisob-kitob buyurtmalar yaratilgan xodim (orders.created_by) bo‘yicha va bekor qilinmagan buyurtmalardan olinadi. Komissiya/bonus faqat hisoblangan ko‘rsatkich; avtomatik ish haqi, buxgalteriya provodkasi yoki bank to‘lovi emas. Soliq, mehnat va buxgalteriya qoidalariga mosligini mutaxassis bilan tekshiring.

Migratsiya 001–010 tartib bilan bajarilishi kerak. PostgreSQL integratsion testi, serverga deploy, APK/IPA yig‘ish ushbu arxiv doirasida bajarilmagan.

v22: Partiya/seriya, yaroqlilik muddati va 90 kunlik ogohlantirishlar uchun 011_v22_inventory_batches.sql migratsiyasini bajaring. Batafsil cheklovlar README_V22_UZ.txt da.


V23: FEFO partiya taqsimoti va qaytarish uchun migrations/012_v23_fefo_returns.sql ni bajaring. Batafsil: README_V23_UZ.txt.

v24: Karantin, hisobdan chiqarish va order refund ledgeri uchun migrations/013_v24_quarantine_refunds.sql ni 001–012 dan keyin bajaring. Batafsil: README_V24_UZ.txt.


v25: Yetkazib beruvchilar, xarid buyurtmalari va qarzdorlik ledgeri. migrations/014_v25_procurement.sql ni 001–013 dan keyin bajaring. Batafsil: README_V25_UZ.txt.


v27: Excel-compatible CSV xarid importi va xarid narxlari tarixi. Batafsil README_V27_UZ.txt. Migratsiya 016.

PHARMA BUSINESS v16 — PLATFORM ADMIN

YANGILIKLAR
- /platform-admin.html: platform operator statistik paneli.
- Firmalar, faol/sinov/cheklangan firmalar, foydalanuvchilar, mahsulotlar, buyurtmalar va joriy oy savdosi ko'rsatkichlari.
- Tarif va firma holatlari kesimida statistika.
- Yaqinda ro'yxatdan o'tgan firmalar ro'yxati.
- Statistik API BOOTSTRAP_SECRET sarlavhasi bilan himoyalangan.

ISHLATISH
1) Serverda BOOTSTRAP_SECRET ni kamida 32 belgili tasodifiy maxfiy qiymatga o'rnating.
2) Serverni qayta ishga tushiring.
3) Vakolatli operator /platform-admin.html sahifasiga kirib maxfiy kalitni kiritsin.
4) BOOTSTRAP_SECRET ni hech qachon frontend kodiga, ommaviy hujjatga yoki mijozlarga bermang.

ESLATMA
Bu boshqaruv paneli statistik kuzatuv uchun. Tarifni o'zgartirish mavjud API orqali himoyalangan maxfiy kalit bilan bajariladi; ushbu UI tarifni o'zgartirishni avtomatlashtirmaydi.

TEKSHIRUV CHEGARALARI
JavaScript sintaksisi va ZIP yaxlitligi tekshiriladi. PostgreSQL integratsion sinovi, real server deploy, penetratsion audit va mobil APK/IPA build bajarilmagan. Ishlab chiqarishdan oldin xavfsizlik auditi, HTTPS, zaxira nusxa, monitoring va maxfiy kalitni rotatsiya qilish talab etiladi.

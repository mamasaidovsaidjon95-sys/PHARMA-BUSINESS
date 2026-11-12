PHARMA BUSINESS v24 — KARANTIN, HISOBDAN CHIQARISH VA PUL QAYTARISH HISOBI

YANGILIKLAR
1) Yaroqsiz yoki sifati shubhali partiya miqdorini karantinga ajratish mumkin. Ajratilgan miqdor stock_movements orqali sotiladigan qoldiqdan chiqariladi.
2) Karantin yozuvini ikki xil yakunlash mumkin: written_off (hisobdan chiqarildi) yoki released (sotiladigan omborga qaytarildi).
3) Muddati o‘tgan partiyani sotiladigan omborga qaytarish bloklanadi.
4) Hisobdan chiqarish va qaytarish amali, bajaruvchi xodim va vaqt audit uchun saqlanadi.
5) Buyurtma bo‘yicha naqd yoki bank o‘tkazmasi ko‘rinishidagi pul qaytarish ledgeri qo‘shildi.
6) Qaytarish summasi buyurtma uchun qayd etilgan to‘lovlarning qaytarilmagan qismidan oshmaydi.
7) Firma kesimida jami, bu oydagi pul qaytarish va qaytarishlar soni ko‘rsatiladi.
8) Interfeysga karantin, hal qilish va pul qaytarish formasi qo‘shildi.

MIGRATSIYA
- Oldingi 001–012 migratsiyalar bajarilgan bo‘lishi kerak.
- migrations/013_v24_quarantine_refunds.sql ni PostgreSQL bazasida bir marta bajaring.
- So‘ng serverni qayta ishga tushiring: npm install && npm start.

API
- GET /api/inventory/quarantine
- POST /api/inventory/quarantine { batchId, quantity, reason }
- POST /api/inventory/quarantine/:id/resolve { action: "writeoff" | "release", note? }
- POST /api/orders/:id/refunds { amount, method: "cash" | "transfer", reason, reference? }
- GET /api/orders/:id/refunds
- GET /api/finance/refunds-summary

MUHIM CHEGARALAR
- Bu versiya pul qaytarishni hisob daftarida qayd qiladi, bank, Click, Payme yoki kassa bilan haqiqiy pul o‘tkazmaydi.
- Pul qaytarish faqat buyurtmaga bog‘langan va payments jadvalida qayd etilgan to‘lovlar summasi doirasida ishlaydi. Umumiy qarzga tushgan, order_id siz to‘lovlar avtomatik taqsimlanmaydi.
- Hisobdan chiqarish yozuvi ichki ombor hisobi; davlat organlariga topshiriladigan rasmiy utilizatsiya dalolatnomasi emas.
- Migratsiya va endpointlar sintaksis darajasida tekshirildi. PostgreSQL integratsion testi, real qurilmada sinov, deploy, Android APK va iOS IPA build bajarilmadi.
- Ishlab chiqarishdan oldin DB backup, rollar, pul qaytarish vakolati, audit, farmatsevtika/soliq va elektron hujjat talablari mahalliy mutaxassis bilan tekshirilsin.

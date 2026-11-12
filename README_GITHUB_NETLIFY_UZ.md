# PHARMA BUSINESS — GitHub + Netlify boshlang'ich paketi

## Nima qayerda ishlaydi?
- GitHub: kodning versiyalari va zaxira nusxasi.
- Netlify: `public/` ichidagi tanishtiruv sayti va PWA interfeysini HTTPS orqali tarqatadi.
- Backend: `src/server.js` (Express) va PostgreSQL alohida Node.js serverida ishlashi kerak.

## Muhim: offline imkoniyati
Hozirgi Service Worker faqat `/`, `/app` va statik resurslar qobig'ini keshlaydi. `/api/` so'rovlari ataylab keshga olinmaydi. Shuning uchun internet uzilganda sahifa ochilishi mumkin, ammo yangi savdo, buyurtma, to'lov va ombor amallari to'liq offline rejimda saqlanib, keyin avtomatik sinxronlanishi hali joriy qilinmagan. Buning uchun IndexedDB asosidagi offline navbat, takroriy yuborishni oldini oluvchi idempotency va server bilan sync mexanizmi ishlab chiqilishi kerak.

## Netlify sozlamasi
- Build command: bo'sh qoldiring.
- Publish directory: `public`.
- `netlify.toml` dagi `https://API_BASE_URL` ni backend HTTPS manzili bilan almashtiring.
- Hozircha API server joylashtirilmaguncha login va ma'lumotlar bilan ishlash to'liq ishlamaydi.

## GitHub'ga yuklash (telefon orqali)
1. GitHub hisobiga kiring va New repository bosing.
2. Repository nomi: `pharma-business`.
3. Public yoki Private tanlang. Ishlab chiqarish maxfiy kodlari, `.env`, parollar va mijoz ma'lumotlarini hech qachon repoga yuklamang.
4. Ushbu papkadagi fayllarni repository root'iga yuklang (ichkaridagi `pb27/` papkasi emas).
5. Netlify'da Add new project → Import an existing project → GitHub → `pharma-business` ni tanlang.
6. Publish directory `public` ekanini tekshiring va Deploy bosing.

## Backendni ishga tushirish
Netlify statik hosting Node/Express serverini va PostgreSQL bazasini doimiy server sifatida ishlatmaydi. Backend uchun alohida Node.js hosting/VPS va PostgreSQL kerak. `README_WEBSITE_V28_UZ.txt` hamda `README_UZ.txt` ni o'qing; 001–016 migratsiyalarni ketma-ket bajaring. `JWT_SECRET`, `BOOTSTRAP_SECRET`, DB paroli kabi sirlarni faqat server environment variables ichida saqlang.

## Ishlab chiqarishga chiqarishdan oldin
- PostgreSQL integratsion sinovlar
- xavfsizlik auditi va tenant isolation tekshiruvi
- backup/restore sinovi
- offline transaction queue + sync
- O'zbekistonning farmatsevtika, shaxsiy ma'lumot, soliq va elektron hujjat talablarini tekshirish

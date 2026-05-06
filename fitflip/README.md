# FitFlip 👟

AI-alapú azonosító sneakerekhez, vintage ruhákhoz és streetwear darabokhoz.

**Élő verzió:** [fitflip.app](https://fitflip.app)

---

## Telepítés a nulláról – követendő lépések

Ez az útmutató pontosan végigvezet a folyamaton. Nem kell kódolni tudni. Számold rá: kb. **30–45 perc**.

### 1. lépés – GitHub repository létrehozása

1. Menj a [github.com](https://github.com) oldalra, jelentkezz be (`kutakbalazs` fiók)
2. Jobb felül kattints a **+** ikonra → **New repository**
3. Repository name: `fitflip`
4. Public legyen (egyelőre, később lehet privát)
5. **NE pipáld be** az "Add a README file" opciót (mert már van)
6. **Create repository** gomb

### 2. lépés – Fájlok feltöltése GitHubra

A legegyszerűbb mód, ha nem ismersz git-et: a böngészőből.

1. Az új repo oldalán látod ezt a sort:
   *"...or upload an existing file"* → kattints rá
2. Húzd be ide az **összes fájlt és mappát** ebből a csomagból (kicsomagolás után)
3. Alul írd be: `Initial commit`
4. Kattints **Commit changes**

> ⚠️ Fontos: a `.env.local` fájlt **soha** ne töltsd fel! A `.gitignore` ezt megakadályozza, de ellenőrizd hogy nem szerepel a fájlok között.

### 3. lépés – Vercel csatlakoztatása

1. Menj a [vercel.com](https://vercel.com) oldalra, jelentkezz be GitHub fiókkal
2. **Add New** → **Project**
3. A `kutakbalazs/fitflip` repó mellett kattints **Import**
4. **Framework Preset**: Next.js (automatikusan érzékeli)
5. **Environment Variables** szekció → Add new:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: itt másold be a saját Anthropic API kulcsodat
6. Kattints **Deploy**

A telepítés 1-2 percet vesz igénybe. Ha kész, kapsz egy `fitflip-xxx.vercel.app` címet – ez már működik!

### 4. lépés – fitflip.app domain bekötése

1. Vercel projektben kattints a **Settings** fülre
2. Bal oldalt **Domains**
3. Add: `fitflip.app` → **Add**
4. A Vercel mutat 2-3 DNS rekordot amit be kell állítanod
5. Menj a **Namecheap** fiókodba → Domain List → fitflip.app → **Manage**
6. **Advanced DNS** fül → másold be a Vercel által megadott rekordokat
7. Várj 5-30 percet – a domain élni fog

---

## Helyi tesztelés (opcionális)

Ha futtatni akarod a saját gépeden a feltöltés előtt:

```bash
npm install
cp .env.example .env.local
# Nyisd meg a .env.local-t és írd be az API kulcsod
npm run dev
```

Megnyílik a `http://localhost:3000` címen.

---

## Mit tud most az app

✅ Sneaker, vintage ruha és streetwear azonosítás fotó alapján
✅ Becsült érték HUF-ban
✅ Magyar és angol felület (kapcsoló a fejlécben)
✅ Napi 3 ingyenes scan (süti alapú számolás)
✅ Mobil és desktop responsive design

🔒 Élő hirdetéskereső (Vinted, eBay, StockX) – prémium funkcióként zárolva
🔒 Stripe előfizetés – a 3. fázisban kerül beépítésre
🔒 Felhasználói fiókok és gyűjtemény napló – a 2. fázisban (Supabase)

---

## Architektúra

- **Frontend & Backend**: Next.js 14 (App Router)
- **Stílus**: Tailwind CSS
- **AI**: Anthropic Claude Sonnet 4.6 (Vision)
- **Hosting**: Vercel
- **Domain**: Namecheap → fitflip.app

---

## Költségek

| Tétel | Költség |
|---|---|
| Vercel Hobby plan | Ingyenes |
| Domain (fitflip.app) | ~$14/év |
| Anthropic API | ~$0.01–0.02 / scan (Sonnet 4.6 Vision) |

100 scan / nap esetén: kb. $1–2 / nap API költség.

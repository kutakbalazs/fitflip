# DPA (Data Processing Agreement) Checklist — FitFlip

GDPR Art. 28 alapján minden adatfeldolgozóval érvényes DPA-nak kell lennie. Az alábbiakat ellenőrizd, és pipáld, amint megerősítetted. Az ellenőrzés URL-jeit beillesztve találod.

## Adatkezelő

- **Név**: Kutak Balázs e.v.
- **Székhely**: 1222 Budapest, Bárány utca 3.
- **Adószám**: 59900490-2-43
- **Kontakt**: support.fitflip@gmail.com

---

## Adatfeldolgozók

### 1. Supabase Inc. — Auth, DB, Storage
- DPA URL: https://supabase.com/legal/dpa
- Státusz: **Automatically incorporated into Supabase Terms of Service.**
  Free tier-en is érvényes. Pro tier-en custom DPA kérhető.
- Lépés: nyisd meg fent a linket, mentsd el PDF-ben az aktuális dátummal.
- Adatok helye: **EU-régió** (Frankfurt / Ireland) — Dashboard → Settings → Infrastructure
- Pipa: [ ]

### 2. Stripe Payments Europe Ltd. — Fizetés
- DPA URL: https://stripe.com/legal/dpa
- Státusz: **A Stripe Services Agreement része** — automatikusan elfogadva amikor regisztráltál.
- Lépés: töltsd le PDF-ben (dátum-bélyegzővel), tedd a `/legal` mappába.
- Stripe egyben **önálló adatkezelő** is a kártyaadatok tekintetében (PCI-DSS Level 1).
- Pipa: [ ]

### 3. Anthropic, PBC — AI képelemzés (Claude)
- DPA URL: https://www.anthropic.com/legal/dpa
- Státusz: **Standard Commercial Terms tartalmazza a Data Processing Provisions-t.**
  Zero-retention DPA Enterprise tier-en érhető el — a consumer use case standard API-ra építve OK.
- Lépés: töltsd le, vagy emailben kérd a `dpa@anthropic.com` címen ha szükséges egyedi.
- Pipa: [ ]

### 4. Resend Inc. — Tranzakciós email
- DPA URL: https://resend.com/legal/dpa (vagy emailben kérve)
- Státusz: **DPA emailben kérhető a `support@resend.com` címen** — kérd el, mentsd PDF-ben.
- Pipa: [ ]

### 5. Vercel Inc. — Hosting
- DPA URL: https://vercel.com/legal/dpa
- Státusz: **Hobby tier-en a standard ToS lefedi. Pro+ tier-en külön aláírható.**
- Pipa: [ ]

---

## Adattovábbítás harmadik országba

A fenti adatfeldolgozók közül **Stripe (IE/US), Anthropic (US), Resend (US), Vercel (US)** USA-beli kapcsolódással. A transzfer jogalapja:

- **Standard Contractual Clauses (SCC)** — Bizottság (EU) 2021/914 határozata, mindegyiknek a DPA-jában hivatkozva
- Vagy **EU–US Data Privacy Framework** önminősítés (Vercel, Stripe, Anthropic tanúsított a DPF listán: https://www.dataprivacyframework.gov)

A SCC + DPF kombinációja az Art. 46 GDPR szerint megfelelő garanciát jelent a harmadik országba történő adattovábbításhoz.

---

## Adatkezelési incidens (data breach) protokoll

1. Incidens észlelése (logok, felhasználói bejelentés)
2. Hatókör felmérése: érintettek köre, adatkategóriák, súlyosság
3. **72 órán belül NAIH bejelentés** ha az érintettek jogaira / szabadságaira nézve kockázat áll fenn
   - NAIH bejelentő űrlap: https://www.naih.hu
4. **Magas kockázat esetén** az érintettek közvetlen tájékoztatása email-ben
5. Dokumentálás: incidens leírása, hatás, intézkedések → tartsd a `/legal/incidents/` mappában

---

## Felülvizsgálat

Ezt a checklist-et és az `art30-adatkezelesi-nyilvantartas.csv` fájlt **évente legalább egyszer** vizsgáld felül, vagy ha:
- új adatfeldolgozót veszel be (pl. analytics tool, push notification szolgáltató),
- új adatkört kezdesz kezelni,
- változik a Szolgáltatás funkcionalitása.

Utolsó felülvizsgálat: 2026-05-19

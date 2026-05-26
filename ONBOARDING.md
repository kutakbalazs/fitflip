# FitFlip — Marketing Brief

Egy Anthropic Claude Cowork agentnek, amit a FitFlip marketingjéhez veszek igénybe. A cél: launch előtt és után segítség a stratégiában, kontentben, copywritingben, outreach-ben.

---

## TL;DR — Mi a FitFlip?

**Egy AI-alapú divat-azonosító webapp magyar piacra.** Lefotózol egy sneakert, vintage ruhát vagy streetwear darabot, és pillanatok alatt megtudod:
- Mi az (márka, modell, év, állapot)
- Mit ér a magyar piacon (Vinted, Jófogás, eBay árak alapján)
- Hol add el — élő hirdetésekkel összehasonlítva

A core USP a **magyar piacra optimalizált árbecslés** + **kultúrkontextus ("Story Mode")** ikonikus darabokra + **hype score**.

---

## Hol állunk most

| | |
|---|---|
| **Stage** | Public MVP, kész, élesben |
| **URL** | https://fitflip.app |
| **Indítás** | 2026 tavaszán (jelenleg tesztelő-fázis indul) |
| **Bevétel** | 0 — még senki nem ismeri, marketing még nem indult |
| **Tech** | Next.js 14 + Supabase + Stripe + Claude Sonnet 4.6 |
| **Csapat** | 1 fő (egyéni vállalkozó) |

A termék funkcionálisan kész: scan, AI elemzés, ár-sáv, élő hirdetések 3 marketplace-ről (Vinted/Jófogás/eBay), prémium előfizetés (Stripe), PWA installálható mobilra. Jogi (ÁSZF/Adatvédelem/Cookies) és GDPR-compliance kész.

**A fázis amit indítok: 5-10 tesztelő → feedback → finomítás → public launch.**

---

## Pricing

| Csomag | Ár | Funkciók |
|---|---|---|
| **Ingyenes** | 0 Ft | 3 scan/nap, alapfunkciók (AI elemzés, ár-sáv, story, hype) |
| **Prémium** | 1 490 Ft / hó | Korlátlan scan, élő hirdetéskeresés Vinted/Jófogás/eBay-ről |

Belépő ár szándékosan alacsony (cigaretta-csomag árához mérhető) — gyors konverzió a cél.

---

## Célközönség

### Elsődleges
**1. Sneakerheadek (18-30, FF/M, fővárosi + nagyvárosok)**
- Air Jordan, Yeezy, Travis Scott, Off-White, Dior x AJ1 gyűjtők
- Vinted + StockX + Goat-ot követik
- Reselling kultúrában aktívak, Discord/Reddit/FB csoportokban élnek
- A "Story Mode" + "Hype Score" direkt nekik szól

**2. Vintage / streetwear flipperek (22-35, fővárosi)**
- Turkálókban vadásznak, Vintage Festen vásárolnak
- Levi's 501-es, Carhartt, Stüssy, vintage band tee-k
- Vinted-en + Marketplace-en árulnak
- A magyar piaci árbecslés nekik aranyat ér

### Másodlagos
**3. Casual eladók (25-45)**
- "Nem tudom mit ér a régi cipőm, hadd nézzem meg" hangulat
- Anyukák, akik a gyerek kinőtt sneakereit eladnák
- Költözős-letakaritós usecase

---

## Brand identity

### Vizuális
- **Letisztult, minimalista, premium-monokróm**. NEM neon, NEM hype, NEM "brüh"
- **Color palette:** ink-900 (fekete) + ink-50 (világosszürke) + fehér; amber, emerald és red accentek pozícióhoz kötve
- **Tipográfia:** Georgia serif a wordmarkra (FF logó) és heading-ekre, system sans a body-ra
- **Hangulat referencia:** Apple, Cosmo Pyke, MM6 Maison Margiela
- **Logo:** "FF" fehér Georgia bold, fekete lekerekített négyzeten

### Hangnem
- **Rövid, magabiztos, tudatos.** "Fotózd. Azonosítsd. Add el." — három ige, kész.
- **NEM patronizing**: nem "Hűha, micsoda darab!" jellegű
- **NEM hype-szerű** mint a sneakerhead-blogok
- **Tényközpontú**: konkrét számok, konkrét hirdetések, konkrét darabok
- **Kicsit elegáns**, fashion-magazin érzettel (mint a Vogue-cikkek tagline-jai)

### Tagline / pozícionálás
- **Magyar:** "Fotózd. Azonosítsd. Add el."
- **Angol:** "Snap. Identify. Sell."
- **Egy-mondatos pitch:** "FitFlip — ez a sneaker mit ér Magyarországon?"

---

## Mi különböztet meg

1. **Magyar piacra optimalizált árazás** — nem dollárt mutat, hanem azt amit a Vinted HU-n vagy Jófogáson kapnál érte. Q1-Q3 sáv valós, élő hirdetésekből, 15%-os spread-en belül.
2. **Story Mode** — ikonikus daraboknál (Travis Scott AJ1, Yeezy Zebra, AJ1 Mocha stb.) AI-generált 3-bekezdéses sztori a kultúr-háttérről. Sneakerheadeknek aranyat ér, sharing-érték óriási.
3. **Hype Score + Badge** — "Holy Grail" 🔥 / "Heat" / "Hyped" / "Vintage Gem" badge a kép sarkán. Játékos, sharable, social-friendly.
4. **3 marketplace egyben** — Vinted, Jófogás, eBay (Deutschland) egy helyen, AI-verifikálva (csak releváns találatok).
5. **Magyar nyelv** — a StockX/Goat angolul vannak, a CamFind nem ismeri a Vinted HU árakat. FitFlip natív magyar.

---

## Open marketing kérdések, ahol kell help

### Stratégia
1. **Soft launch vs big bang?** Tesztelőkkel feedback-iteráció → fokozatos nyitás csapatonként? Vagy egy nagy PR-day?
2. **Hol vannak a magyar sneakerheadek?** Melyik FB csoport, melyik Discord, melyik Reddit (r/SneakerMarket/?), melyik IG/TikTok hashtag releváns?
3. **Mi a hook első körben?** A magyar piaci ár? A Story Mode? A speed?

### Content (TikTok / Reels)
4. **Milyen formátum konvertál?** "I scanned 5 thrift store finds" / "Real value of my old sneakers" / "Hidden gems on Vinted HU"?
5. **Pacing?** Naponta? Hetente? Mennyi a sustainable a launch első 90 napjában?
6. **Voiceover vagy text-only?** Sneakerhead-content általában gyors text-overlay + cool zene.

### Influencer & PR
7. **Magyar microinfluencer-targetek** (sneakerhead, vintage, streetwear vertikálban, 5-50k follower)? Konkrét nevek érdekelnek.
8. **HU tech / startup lapok** (Forbes HU, hwsw, Index Brandcontent, G7) — melyik vinné el az "AI + magyar piac" sztorit?
9. **PR pitch szöveg** — kell egy press-release sablon.

### Konverziós funnel
10. **Honnan kapunk legjobb LTV-t?** Facebook ads? IG ads? TikTok ads? Magyar Google Ads?
11. **Free → Prémium konverzió?** Most a 4. scan napi limit-nél van a paywall. Jó-e ez? Vagy fizetős feature-höz kötjük (story mode? listings?)?
12. **Pricing benchmarking** — 1 490 Ft jó-e? Túl alacsony / túl magas? Mit használnak referenciának a magyar SaaS-ok?

### Copywriting
13. **Landing page hook** — kell egy 2-3 verzió A/B teszthez.
14. **App store leírás** (PWA még, de jövőre App Store + Play Store) — angol+magyar verzió.
15. **Ad copy variánsok** — FB/IG/TikTok rövid CTA-k.

---

## Asset-ek / linkek

- **Live app:** https://fitflip.app
- **Support email:** support.fitflip@gmail.com
- **GitHub repo:** https://github.com/kutakbalazs/fitflip (private)
- **Brand asset-ek:** `/fitflip/public/brand/` — logo + ikon dark/light SVG + PNG
- **Jogi:** /terms, /privacy, /cookies (HU + EN)

### Cégadatok (számlázáshoz / PR-hez)
- Név: Kutak Balázs e.v.
- Székhely: 1222 Budapest, Bárány utca 3.
- Adószám: 59900490-2-43

---

## Mit várok a Cowork agent-től

Prioritizálva, magasról lefelé:

1. **Soft launch terv** (4 hetes naptár, célok, csatornák, asset-szükséglet) — ezt csináljuk legelőször
2. **Content pillarok** (3-5 fő content-típus a Reels/TikTok-ra konkrét hookkal)
3. **Influencer/PR target lista** magyar névvel + email/IG kontakttal
4. **Pricing-validáció** (versenytárs-analízis, ár-tesztelési javaslat)
5. **Copy-variánsok** (landing hook, ad copy, app store leírás)
6. **Konverziós analitika** mit kell installálni post-launch (Plausible? Posthog? Vercel Analytics?)

### Stílus elvárás a kommunikációban
- **Konkrét.** Ne "valószínűleg érdemes lenne" — hanem "ezt csináld, ezért".
- **Magyar nyelven**, magyar piaci kontextusban (HU influencer-nevek, HU lapok, HU vásárlói szokások).
- **Adatvezérelt, ha tudod** — ha versenytársak listáját kérem, mondj 5-10 konkrét nevet, ne 2-t.
- **Akciókra bontva** — kész-naptár, kész email-sablon, kész landing copy. NEM 50 oldal brainstormolás.

---

*Utolsó frissítés: 2026-05-21*

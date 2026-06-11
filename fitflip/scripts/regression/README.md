# Scan-pipeline regressziós tesztek

Referencia-képek ismert helyes válasszal. A scan + hirdetéskeresés **valódi,
teljes folyamatát** futtatja (igazi AI-hívásokkal és piaci keresésekkel) egy
eldobható teszt-felhasználóval, majd mindent kitakarít maga után.

## Futtatás

```bash
# 1. terminál: dev server
npm run dev

# 2. terminál:
node scripts/regression/run.mjs
```

- A `.env.local`-ból olvassa a Supabase/Anthropic kulcsokat.
- Költség: ~4 AI-elemzés + 2-3 hirdetés-ellenőrzés ≈ 40-60 Ft futásonként.
- A végén `exit 1`, ha bármelyik elvárás bukott — CI-ba is köthető.

## Mikor futtasd

A scan-folyamatot érintő MINDEN változtatás után (prompt, szűrés, pontozás,
verifikáció). Így azonnal kiderül, ha egy javítás máshol rontott.

## Új eset hozzáadása

1. Tegyél egy jpg-t az `images/` mappába
2. Vegyél fel egy bejegyzést a `cases.json`-ba:
   - `brandPattern` / `modelPattern`: regex (kisbetű-érzéketlen)
   - `itemType`: elvárt típus
   - `minExactListings` / `minTotalListings`: hirdetés-darabszám küszöbök
     (a piac változik — inkább alsó korlátot adj, ne pontos számot)

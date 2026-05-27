"use client";

import LegalShell from "@/components/LegalShell";

export default function PrivacyPage() {
  return (
    <LegalShell
      titleHu="Adatvédelmi nyilatkozat"
      titleEn="Privacy Policy"
      effectiveDate="2026-05-19"
    >
      {(lang) => (lang === "hu" ? <ContentHu /> : <ContentEn />)}
    </LegalShell>
  );
}

function ContentHu() {
  return (
    <>
      <p>
        A jelen Adatvédelmi nyilatkozat a természetes személyeknek a személyes adatok kezelése tekintetében történő védelméről és az ilyen adatok szabad áramlásáról szóló (EU) 2016/679 rendelet („GDPR"), valamint az információs önrendelkezési jogról és az információszabadságról szóló 2011. évi CXII. törvény („Infotv.") rendelkezéseinek megfelelően készült.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">1. Az adatkezelő</h2>
      <p>
        Név: Kutak Balázs e.v.<br />
        Székhely: 1222 Budapest, Bárány utca 3.<br />
        Adószám: 59900490-2-43<br />
        Email: support.fitflip@gmail.com
      </p>
      <p>
        Adatvédelmi tisztviselő (DPO) kijelölésére jogszabály alapján nem köteles az Adatkezelő. Adatvédelmi kérdésekkel a fenti email címen lehet az Adatkezelőhöz fordulni.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. Az adatkezelés célja, jogalapja és tárolási ideje</h2>
      <table className="w-full text-xs my-4 border-collapse">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-700">
            <th className="text-left py-2 pr-2">Cél</th>
            <th className="text-left py-2 pr-2">Adatkör</th>
            <th className="text-left py-2 pr-2">Jogalap (GDPR)</th>
            <th className="text-left py-2">Megőrzés</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Fiók létrehozása és karbantartása</td>
            <td className="py-2 pr-2">Email cím, jelszó hash, nyelvi beállítás, regisztráció ideje, Google OAuth azonosító (ha alkalmazható)</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – szerződés teljesítése</td>
            <td className="py-2">A fiók törléséig + 30 nap</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Scan szolgáltatás nyújtása (kép-elemzés, árbecslés)</td>
            <td className="py-2 pr-2">Feltöltött képek, AI elemzés eredménye, scan időpontja</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – szerződés teljesítése</td>
            <td className="py-2">A fiók törléséig, vagy amíg a Felhasználó a scant nem törli</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Napi scan limit kezelése (visszaélés-megelőzés)</td>
            <td className="py-2 pr-2">Felhasználói azonosító, napi scan-szám</td>
            <td className="py-2 pr-2">Art. 6(1)(f) – jogos érdek (szolgáltatás védelme)</td>
            <td className="py-2">24 órás aggregált számláló, naponta nullázódik</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Prémium előfizetés és fizetés</td>
            <td className="py-2 pr-2">Stripe ügyfél-azonosító, előfizetés státusza, számlázási cím (a Stripe-on keresztül)</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – szerződés teljesítése</td>
            <td className="py-2">A számviteli kötelezettség lejártáig (8 év)</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Számlázás</td>
            <td className="py-2 pr-2">Név, számlázási cím, vásárolt tételek, összeg</td>
            <td className="py-2 pr-2">Art. 6(1)(c) – jogi kötelezettség (Sztv. 169. §)</td>
            <td className="py-2">8 év</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Tranzakciós emailek (megerősítés, jelszó-reset)</td>
            <td className="py-2 pr-2">Email cím, küldés ideje, küldés státusza</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – szerződés teljesítése</td>
            <td className="py-2">A fiók törléséig</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Rendszer-logok, hibakeresés, biztonság</td>
            <td className="py-2 pr-2">IP cím, user agent, hibák, kérési időpontok</td>
            <td className="py-2 pr-2">Art. 6(1)(f) – jogos érdek (biztonság, hibakeresés)</td>
            <td className="py-2">30 nap</td>
          </tr>
          <tr>
            <td className="py-2 pr-2">Panaszkezelés</td>
            <td className="py-2 pr-2">Email kommunikáció, panasz tárgya</td>
            <td className="py-2 pr-2">Art. 6(1)(c) – jogi kötelezettség (Fgytv. 17/A. §)</td>
            <td className="py-2">5 év</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. Adatfeldolgozók (címzettek)</h2>
      <p>
        Az Adatkezelő az alábbi adatfeldolgozókat veszi igénybe a Szolgáltatás nyújtásához. Mindegyik adatfeldolgozóval az Adatkezelő GDPR Art. 28 szerinti adatfeldolgozói szerződéssel rendelkezik:
      </p>
      <ul className="list-disc pl-6 my-2">
        <li>
          <strong>Supabase Inc.</strong> (1 Letterman Drive, San Francisco, CA 94129, USA) – fiók, adatbázis, képtárolás. Az adatok EU-régiókban tárolódnak.
        </li>
        <li>
          <strong>Stripe Payments Europe Ltd.</strong> (Block 4, Harcourt Centre, Harcourt Road, Dublin 2, Írország) – fizetés-feldolgozás. Stripe önálló adatkezelőként is eljár a kártyaadatok tekintetében.
        </li>
        <li>
          <strong>Anthropic, PBC</strong> (548 Market St PMB 90375, San Francisco, CA 94104, USA) – AI képelemzés (Claude). A feltöltött képek és prompt-adatok rövid ideig az Anthropic szervereire kerülnek a válasz generálása érdekében.
        </li>
        <li>
          <strong>Resend Inc.</strong> (2261 Market Street #4036, San Francisco, CA 94114, USA) – tranzakciós email kiküldés.
        </li>
        <li>
          <strong>Vercel Inc.</strong> (440 N Barranca Ave #4133, Covina, CA 91723, USA) – hosting, edge-szolgáltatás.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. Adattovábbítás harmadik országba</h2>
      <p>
        A fenti adatfeldolgozók közül Stripe, Anthropic, Resend és Vercel egyesült államokbeli székhelyű. Az ezen szolgáltatóknak történő adattovábbítás jogalapja az Európai Bizottság (EU) 2021/914 végrehajtási határozatában foglalt általános adatvédelmi szerződéses feltételek (SCC), illetve – amennyiben az adott szolgáltató tanúsítva van – az EU–USA Adatvédelmi Keretrendszer (Data Privacy Framework) szerinti megfelelőségi határozat (Art. 45 GDPR).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">5. Automatizált döntéshozatal, AI-feldolgozás</h2>
      <p>
        A Szolgáltatás központi funkciója egy AI modell (Claude, Anthropic), amely a Felhasználó által feltöltött képet automatizáltan elemzi és ár-becslést ad. Ez az automatizált adatfeldolgozás nem minősül a GDPR 22. cikk szerinti, kizárólag automatizált döntéshozatalnak, mivel az eredmény tájékoztató jellegű, nem jár a Felhasználóra nézve jogi vagy hasonlóan jelentős hatással, és a Felhasználó szabadon dönt a végső eladási vagy vásárlási döntéseiről.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">6. Érintett (Felhasználói) jogok</h2>
      <p>A GDPR alapján a Felhasználót az alábbi jogok illetik meg:</p>
      <ul className="list-disc pl-6 my-2">
        <li><strong>Hozzáférés (Art. 15):</strong> tájékoztatás a kezelt adatokról, másolat kérése.</li>
        <li><strong>Helyesbítés (Art. 16):</strong> pontatlan adat kijavítása.</li>
        <li><strong>Törlés / „elfeledtetéshez való jog" (Art. 17):</strong> a fiók és a hozzá kapcsolódó scan adatok törlése. A számviteli bizonylatokat a törlési kérelem ellenére a jogszabályi megőrzési idő végéig (8 év) megőrizzük.</li>
        <li><strong>Korlátozás (Art. 18):</strong> adott esetekben az adatkezelés korlátozása.</li>
        <li><strong>Adathordozhatóság (Art. 20):</strong> a kezelt adatok strukturált, géppel olvasható formában történő kiadása.</li>
        <li><strong>Tiltakozás (Art. 21):</strong> jogos érdeken alapuló adatkezelés ellen.</li>
        <li><strong>Hozzájárulás visszavonása:</strong> ha az adatkezelés hozzájáruláson alapul, az bármikor visszavonható (a visszavonás nem érinti a megelőző adatkezelés jogszerűségét).</li>
      </ul>
      <p>
        E jogok gyakorlása érdekében a Felhasználó a support.fitflip@gmail.com email címen léphet kapcsolatba az Adatkezelővel. Az Adatkezelő a kérelemre indokolatlan késedelem nélkül, de legfeljebb 30 napon belül érdemi választ ad.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">7. Panasz a felügyeleti hatóságnál</h2>
      <p>
        A Felhasználó jogosult panaszt benyújtani a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH):
      </p>
      <p>
        NAIH, 1055 Budapest, Falk Miksa utca 9–11.<br />
        Postacím: 1363 Budapest, Pf. 9.<br />
        Email: ugyfelszolgalat@naih.hu<br />
        Web: <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" className="underline">www.naih.hu</a>
      </p>
      <p>
        A Felhasználó jogainak megsértése esetén bírósághoz is fordulhat (lakóhelye vagy az Adatkezelő székhelye szerint illetékes törvényszék).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">8. Adatbiztonság</h2>
      <p>
        Az Adatkezelő a GDPR 32. cikkével összhangban megfelelő technikai és szervezési intézkedéseket alkalmaz az adatok biztonsága érdekében: HTTPS/TLS titkosítás a kommunikációban, hash-elt és „salted" jelszavak (Supabase Auth, bcrypt-alapú), hozzáférési szintek (Row Level Security), naplózás, biztonsági frissítések.
      </p>
      <p>
        Adatvédelmi incidens esetén az Adatkezelő 72 órán belül értesíti a NAIH-ot, és magas kockázat esetén az érintetteket is, a GDPR 33–34. cikk szerint.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">9. Sütik</h2>
      <p>
        A weboldal sütik (cookies) használatáról részletes információt a <a href="/cookies" className="underline hover:text-ink-700 dark:hover:text-ink-200">Cookie tájékoztató</a> tartalmaz.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">10. Korhatár</h2>
      <p>
        A Szolgáltatás 16. életévét betöltött személyek számára érhető el. 16 év alatti gyermek adatainak kezeléséhez a törvényes képviselő hozzájárulása szükséges. Ha tudomást szerzünk arról, hogy 16 év alatti gyermek adatait hozzájárulás nélkül kezeljük, az adatokat haladéktalanul töröljük.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">11. A tájékoztató módosítása</h2>
      <p>
        Az Adatkezelő fenntartja a jogot a jelen Adatvédelmi nyilatkozat módosítására. Lényeges változás esetén a Felhasználót emailben és a weboldalon közzétett értesítéssel tájékoztatja, legalább 15 nappal a hatálybalépés előtt.
      </p>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <p>
        This Privacy Policy has been prepared in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council („GDPR&quot;) and Hungarian Act CXII of 2011 on the Right of Informational Self-Determination and Freedom of Information.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">1. Data Controller</h2>
      <p>
        Name: Kutak Balázs e.v.<br />
        Registered address: 1222 Budapest, Bárány utca 3., Hungary<br />
        Tax ID: 59900490-2-43<br />
        Email: support.fitflip@gmail.com
      </p>
      <p>
        The Controller is not legally required to appoint a Data Protection Officer (DPO). For any privacy-related matter, please contact the Controller at the email address above.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. Purposes, legal bases and retention</h2>
      <table className="w-full text-xs my-4 border-collapse">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-700">
            <th className="text-left py-2 pr-2">Purpose</th>
            <th className="text-left py-2 pr-2">Data</th>
            <th className="text-left py-2 pr-2">Legal basis (GDPR)</th>
            <th className="text-left py-2">Retention</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Account creation and maintenance</td>
            <td className="py-2 pr-2">Email, password hash, language pref, registration date, Google OAuth id (if used)</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – performance of contract</td>
            <td className="py-2">Until account deletion + 30 days</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Scan service (image analysis, price estimate)</td>
            <td className="py-2 pr-2">Uploaded images, AI analysis result, scan timestamp</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – performance of contract</td>
            <td className="py-2">Until account deletion or scan deletion</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Daily scan limit (abuse prevention)</td>
            <td className="py-2 pr-2">User id, daily scan count</td>
            <td className="py-2 pr-2">Art. 6(1)(f) – legitimate interest (service protection)</td>
            <td className="py-2">24-hour aggregate, reset daily</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Premium subscription and payment</td>
            <td className="py-2 pr-2">Stripe customer id, subscription status, billing address (via Stripe)</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – performance of contract</td>
            <td className="py-2">8 years (accounting obligation)</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Invoicing</td>
            <td className="py-2 pr-2">Name, billing address, purchased items, amount</td>
            <td className="py-2 pr-2">Art. 6(1)(c) – legal obligation (Act C of 2000 § 169)</td>
            <td className="py-2">8 years</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">Transactional emails (confirmation, password reset)</td>
            <td className="py-2 pr-2">Email address, send time, delivery status</td>
            <td className="py-2 pr-2">Art. 6(1)(b) – performance of contract</td>
            <td className="py-2">Until account deletion</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-800">
            <td className="py-2 pr-2">System logs, debugging, security</td>
            <td className="py-2 pr-2">IP address, user agent, errors, request timestamps</td>
            <td className="py-2 pr-2">Art. 6(1)(f) – legitimate interest (security, debugging)</td>
            <td className="py-2">30 days</td>
          </tr>
          <tr>
            <td className="py-2 pr-2">Complaint handling</td>
            <td className="py-2 pr-2">Email communications, complaint subject</td>
            <td className="py-2 pr-2">Art. 6(1)(c) – legal obligation</td>
            <td className="py-2">5 years</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. Data processors (recipients)</h2>
      <p>
        The Controller uses the following processors to deliver the Service. The Controller has entered into a GDPR Art. 28 data processing agreement with each:
      </p>
      <ul className="list-disc pl-6 my-2">
        <li><strong>Supabase Inc.</strong> (San Francisco, USA) – authentication, database, image storage. Data is stored in EU regions.</li>
        <li><strong>Stripe Payments Europe Ltd.</strong> (Dublin, Ireland) – payment processing. Stripe also acts as an independent controller for card data.</li>
        <li><strong>Anthropic, PBC</strong> (San Francisco, USA) – AI image analysis (Claude). Uploaded images and prompt data are briefly transmitted to Anthropic&apos;s servers to generate the response.</li>
        <li><strong>Resend Inc.</strong> (San Francisco, USA) – transactional email delivery.</li>
        <li><strong>Vercel Inc.</strong> (Covina, USA) – hosting, edge services.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. International data transfers</h2>
      <p>
        Of the processors listed above, Stripe, Anthropic, Resend and Vercel are US-based. Transfers to these providers rely on the Standard Contractual Clauses adopted by Commission Implementing Decision (EU) 2021/914 and/or – where the relevant provider is self-certified – the EU–US Data Privacy Framework adequacy decision (GDPR Art. 45).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">5. Automated processing, AI</h2>
      <p>
        The core function of the Service is an AI model (Claude, Anthropic) that automatically analyses the photograph uploaded by the user and provides a price estimate. This automated processing does not constitute solely automated decision-making within the meaning of GDPR Art. 22, because the output is informational, has no legal or similarly significant effect on the user, and the user remains free to make their own final purchase or sale decisions.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">6. Your rights</h2>
      <p>Under the GDPR you have the following rights:</p>
      <ul className="list-disc pl-6 my-2">
        <li><strong>Access (Art. 15):</strong> request information about and a copy of your processed data.</li>
        <li><strong>Rectification (Art. 16):</strong> correct inaccurate data.</li>
        <li><strong>Erasure / „right to be forgotten&quot; (Art. 17):</strong> delete your account and associated scans. Accounting records are retained for the statutory retention period (8 years) regardless of the erasure request.</li>
        <li><strong>Restriction (Art. 18):</strong> restriction of processing in certain cases.</li>
        <li><strong>Portability (Art. 20):</strong> receive your data in a structured, machine-readable format.</li>
        <li><strong>Objection (Art. 21):</strong> object to processing based on legitimate interest.</li>
        <li><strong>Withdrawal of consent:</strong> where processing is based on consent, you may withdraw it at any time (without affecting lawfulness of prior processing).</li>
      </ul>
      <p>
        To exercise these rights, contact the Controller at support.fitflip@gmail.com. The Controller will respond without undue delay and within 30 days at the latest.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">7. Complaint to the supervisory authority</h2>
      <p>
        You have the right to lodge a complaint with the Hungarian National Authority for Data Protection and Freedom of Information (NAIH):
      </p>
      <p>
        NAIH, 1055 Budapest, Falk Miksa utca 9–11., Hungary<br />
        Mail: 1363 Budapest, Pf. 9.<br />
        Email: ugyfelszolgalat@naih.hu<br />
        Web: <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" className="underline">www.naih.hu</a>
      </p>
      <p>
        You may also bring proceedings before a competent court (the court of your habitual residence or the Controller&apos;s seat).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">8. Data security</h2>
      <p>
        In accordance with GDPR Art. 32 the Controller applies appropriate technical and organisational measures: HTTPS/TLS encryption in transit, hashed and salted passwords (Supabase Auth, bcrypt-based), access tiers (Row Level Security), logging, security patches.
      </p>
      <p>
        In the event of a personal data breach, the Controller will notify NAIH within 72 hours and, where the breach is likely to result in a high risk to the rights and freedoms of data subjects, the affected users, in accordance with GDPR Arts. 33–34.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">9. Cookies</h2>
      <p>
        Detailed information on cookies used by this website is provided in the <a href="/cookies" className="underline hover:text-ink-700 dark:hover:text-ink-200">Cookie Notice</a>.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">10. Age requirement</h2>
      <p>
        The Service is available to users aged 16 and over. Processing data of a child under 16 requires the consent of their legal guardian. If we become aware that we are processing data of a child under 16 without such consent, we will delete the data without undue delay.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">11. Changes to this Policy</h2>
      <p>
        The Controller reserves the right to amend this Privacy Policy. Material changes will be notified to users by email and via a notice on the website at least 15 days before the effective date.
      </p>
    </>
  );
}

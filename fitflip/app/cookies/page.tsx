"use client";

import LegalShell from "@/components/LegalShell";

export default function CookiesPage() {
  return (
    <LegalShell
      titleHu="Cookie tájékoztató"
      titleEn="Cookie Notice"
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
        A FitFlip weboldal sütiket és más böngészőben tárolt adatokat használ. Az alábbiakban átláthatóan bemutatjuk, milyen sütiket alkalmazunk és miért. A jelen tájékoztató az elektronikus hírközlésről szóló 2003. évi C. törvény és az ePrivacy irányelv (2002/58/EK) szerint készült.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">1. Mik azok a sütik?</h2>
      <p>
        A süti (cookie) egy kis méretű adatfájl, amelyet a weboldal a böngészőjén keresztül helyez el az eszközén. Ezen kívül a FitFlip a böngésző localStorage és sessionStorage tárolóit is használja egyes beállítások eltárolására – ezek jogi szempontból a sütikkel egyenértékűnek tekintendők.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. Milyen sütiket használunk?</h2>

      <h3 className="font-semibold mt-6 mb-2">2.1. Feltétlenül szükséges (működéshez kötelező) sütik</h3>
      <p>Ezek nélkül a Szolgáltatás nem működne. Külön hozzájárulást nem igényelnek (ePrivacy 5. cikk (3) kivétel).</p>
      <table className="w-full text-xs my-4 border-collapse">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-700">
            <th className="text-left py-2 pr-2">Név</th>
            <th className="text-left py-2 pr-2">Cél</th>
            <th className="text-left py-2 pr-2">Forrás</th>
            <th className="text-left py-2">Élettartam</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">sb-access-token, sb-refresh-token</td>
            <td className="py-2 pr-2">Bejelentkezett munkamenet fenntartása</td>
            <td className="py-2 pr-2">Supabase Auth</td>
            <td className="py-2">Munkamenet / 1 hét</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">ff-lang (localStorage)</td>
            <td className="py-2 pr-2">Nyelvi beállítás megjegyzése (HU/EN)</td>
            <td className="py-2 pr-2">FitFlip</td>
            <td className="py-2">Tartós, a böngésző-adatok törléséig</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">ff-cookie-consent (localStorage)</td>
            <td className="py-2 pr-2">A sütibanner-választás megjegyzése</td>
            <td className="py-2 pr-2">FitFlip</td>
            <td className="py-2">Tartós, a böngésző-adatok törléséig</td>
          </tr>
          <tr>
            <td className="py-2 pr-2">__stripe_mid, __stripe_sid</td>
            <td className="py-2 pr-2">Csalásmegelőzés a fizetési oldalon (csak a checkout során)</td>
            <td className="py-2 pr-2">Stripe</td>
            <td className="py-2">1 év / munkamenet</td>
          </tr>
        </tbody>
      </table>

      <h3 className="font-semibold mt-6 mb-2">2.2. Analitikai és marketing sütik</h3>
      <p>
        A FitFlip <strong>nem használ</strong> harmadik féltől származó analitikai (pl. Google Analytics) vagy marketing sütiket (pl. Meta Pixel, hirdetési követőkódok). Amennyiben a jövőben ilyen sütiket bevezetünk, a sütibanner külön hozzájárulást fog kérni az aktiválásukhoz, és a jelen tájékoztatót frissítjük.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. Hozzájárulás visszavonása</h2>
      <p>
        A süti-választást bármikor megváltoztathatja:
      </p>
      <ul className="list-disc pl-6 my-2">
        <li>A böngésző-adatok között a localStorage-ból törli a <code>ff-cookie-consent</code> kulcsot, ekkor a sütibanner újra megjelenik.</li>
        <li>A böngésző beállításaiban tilthatja, korlátozhatja vagy automatikusan törölheti a sütiket. Ennek hatására a Szolgáltatás egyes funkciói (pl. bejelentkezve maradás) nem fognak megfelelően működni.</li>
      </ul>
      <p>Részletes útmutató böngészőnként:</p>
      <ul className="list-disc pl-6 my-2">
        <li>Chrome: chrome://settings/cookies</li>
        <li>Firefox: about:preferences#privacy</li>
        <li>Safari: Beállítások → Adatvédelem</li>
        <li>Edge: edge://settings/content/cookies</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. Kapcsolat</h2>
      <p>
        Sütikkel kapcsolatos kérdésekkel a support.fitflip@gmail.com email címen léphet kapcsolatba az Adatkezelővel. Az adatkezelés részleteit az <a href="/privacy" className="underline hover:text-ink-700 dark:hover:text-ink-200">Adatvédelmi nyilatkozat</a> tartalmazza.
      </p>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <p>
        The FitFlip website uses cookies and other browser-stored data. Below we explain transparently which cookies we use and why. This notice has been prepared in accordance with Hungarian Act C of 2003 on electronic communications and the ePrivacy Directive (2002/58/EC).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">1. What are cookies?</h2>
      <p>
        A cookie is a small data file placed on your device through your browser. FitFlip also uses the browser&apos;s localStorage and sessionStorage – legally these are treated as equivalent to cookies.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. Which cookies do we use?</h2>

      <h3 className="font-semibold mt-6 mb-2">2.1. Strictly necessary cookies</h3>
      <p>The Service cannot operate without these. No consent is required (ePrivacy Art. 5(3) exemption).</p>
      <table className="w-full text-xs my-4 border-collapse">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-700">
            <th className="text-left py-2 pr-2">Name</th>
            <th className="text-left py-2 pr-2">Purpose</th>
            <th className="text-left py-2 pr-2">Source</th>
            <th className="text-left py-2">Lifetime</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">sb-access-token, sb-refresh-token</td>
            <td className="py-2 pr-2">Maintain logged-in session</td>
            <td className="py-2 pr-2">Supabase Auth</td>
            <td className="py-2">Session / 1 week</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">ff-lang (localStorage)</td>
            <td className="py-2 pr-2">Remember language preference (HU/EN)</td>
            <td className="py-2 pr-2">FitFlip</td>
            <td className="py-2">Persistent, until browser data cleared</td>
          </tr>
          <tr className="border-b border-ink-100 dark:border-ink-700">
            <td className="py-2 pr-2">ff-cookie-consent (localStorage)</td>
            <td className="py-2 pr-2">Remember cookie banner choice</td>
            <td className="py-2 pr-2">FitFlip</td>
            <td className="py-2">Persistent, until browser data cleared</td>
          </tr>
          <tr>
            <td className="py-2 pr-2">__stripe_mid, __stripe_sid</td>
            <td className="py-2 pr-2">Fraud prevention on checkout (only during checkout)</td>
            <td className="py-2 pr-2">Stripe</td>
            <td className="py-2">1 year / session</td>
          </tr>
        </tbody>
      </table>

      <h3 className="font-semibold mt-6 mb-2">2.2. Analytics and marketing cookies</h3>
      <p>
        FitFlip does <strong>not</strong> use third-party analytics (e.g. Google Analytics) or marketing cookies (e.g. Meta Pixel, advertising trackers). If we introduce such cookies in the future, the cookie banner will explicitly request consent before activating them, and this notice will be updated.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. Withdrawing consent</h2>
      <p>You can change your cookie preferences at any time:</p>
      <ul className="list-disc pl-6 my-2">
        <li>Remove the <code>ff-cookie-consent</code> key from localStorage – the cookie banner will re-appear.</li>
        <li>Block, restrict or auto-delete cookies in your browser settings. This may impair some functions of the Service (e.g. staying logged in).</li>
      </ul>
      <p>Browser-specific guides:</p>
      <ul className="list-disc pl-6 my-2">
        <li>Chrome: chrome://settings/cookies</li>
        <li>Firefox: about:preferences#privacy</li>
        <li>Safari: Settings → Privacy</li>
        <li>Edge: edge://settings/content/cookies</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. Contact</h2>
      <p>
        For questions about cookies, contact the Controller at support.fitflip@gmail.com. Data processing details are in the <a href="/privacy" className="underline hover:text-ink-700 dark:hover:text-ink-200">Privacy Policy</a>.
      </p>
    </>
  );
}

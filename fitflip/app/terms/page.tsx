"use client";

import LegalShell from "@/components/LegalShell";

export default function TermsPage() {
  return (
    <LegalShell
      titleHu="Általános Szerződési Feltételek"
      titleEn="Terms and Conditions"
      effectiveDate="2026-05-19"
    >
      {(lang) => (lang === "hu" ? <ContentHu /> : <ContentEn />)}
    </LegalShell>
  );
}

function ContentHu() {
  return (
    <>
      <h2 className="text-lg font-semibold mt-8 mb-2">1. Szolgáltató adatai</h2>
      <p>
        Név: Kutak Balázs e.v.<br />
        Székhely: 1222 Budapest, Bárány utca 3.<br />
        Adószám: 59900490-2-43<br />
        Email: support@fitflip.app<br />
        Weboldal: https://fitflip.app
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. Általános rendelkezések</h2>
      <p>
        A jelen Általános Szerződési Feltételek (a továbbiakban: „ÁSZF") a Kutak Balázs e.v. (a továbbiakban: „Szolgáltató") által üzemeltetett FitFlip online szolgáltatás (a továbbiakban: „Szolgáltatás") használatának feltételeit szabályozzák. A Szolgáltatás igénybevételével a Felhasználó kifejezetten elfogadja a jelen ÁSZF-et és az Adatvédelmi nyilatkozatot.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. A Szolgáltatás leírása</h2>
      <p>
        A FitFlip egy mesterséges intelligencia (AI) alapú azonosító alkalmazás, amely a Felhasználó által feltöltött fotók alapján sneakert, vintage ruhát és streetwear darabokat azonosít, valamint becsült piaci árat és összehasonlító hirdetési adatokat jelenít meg.
      </p>
      <p>
        A megjelenített árbecslések és piaci adatok kizárólag tájékoztató jellegűek, nem minősülnek pénzügyi tanácsadásnak vagy garanciának. A valódi eladási ár ezektől eltérhet.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. Regisztráció és szerződéskötés</h2>
      <p>
        A Szolgáltatás használatához regisztráció szükséges email cím megadásával és jelszó beállításával, vagy Google fiókkal történő bejelentkezéssel. A regisztrációval a Felhasználó és a Szolgáltató között elektronikus úton szerződés jön létre, amely magyar nyelvű, nem minősül írásbeli szerződésnek, és a Szolgáltató nem iktatja.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">5. Csomagok és árak</h2>
      <p>
        <strong>Ingyenes csomag:</strong> napi 3 scan, alapfunkciók.<br />
        <strong>Prémium csomag:</strong> 1 490 Ft / hó (bruttó, ÁFA-mentes alanyi mentesség alapján), korlátlan scan és élő hirdetéskeresés (Vinted, Jófogás, eBay).
      </p>
      <p>
        A prémium előfizetés automatikusan megújul havonta a Felhasználó által regisztrált fizetési módon, amíg a Felhasználó le nem mondja azt. A fizetést a Stripe Payments Europe Ltd. (Ír Köztársaság) bonyolítja le; bankkártya-adatokat a Szolgáltató nem kezel.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">6. Felmondás és lemondás</h2>
      <p>
        A Felhasználó az előfizetését bármikor lemondhatja a fiókján belül elérhető „Előfizetés kezelése" felületen keresztül. A lemondás az aktuális számlázási ciklus végén lép hatályba; visszatérítés a már fizetett időszakra nem jár.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">7. Elállási jog (14 nap)</h2>
      <p>
        A 45/2014. (II. 26.) Korm. rendelet alapján a Felhasználót megilleti a szerződéstől való elállás joga a szerződéskötéstől számított 14 napon belül, indokolás nélkül.
      </p>
      <p>
        <strong>Az elállási jog elvesztése:</strong> A digitális tartalom (FitFlip Szolgáltatás) szolgáltatása a Felhasználó előzetes kifejezett hozzájárulásával a 14 napos elállási határidő lejárta előtt megkezdődik. A Felhasználó az előfizetés megvásárlásakor tudomásul veszi, hogy a teljesítés azonnali megkezdéséhez hozzájárul, és ezzel a 45/2014. (II. 26.) Korm. rendelet 29. § (1) bek. m) pontja alapján az elállási jogát elveszíti, amennyiben a teljesítés a hozzájárulása alapján megkezdődött.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">8. Felhasználó kötelezettségei</h2>
      <p>
        A Felhasználó vállalja, hogy a Szolgáltatást kizárólag jogszerű célokra használja, és:
      </p>
      <ul className="list-disc pl-6 my-2">
        <li>nem tölt fel jogszabályba ütköző, mások jogait sértő tartalmat,</li>
        <li>nem próbálja meg visszafejteni, manipulálni vagy túlterhelni a Szolgáltatást,</li>
        <li>nem oszt meg fiókhozzáférést harmadik személlyel,</li>
        <li>a valós, saját maga által birtokolt vagy birtokolni kívánt darabokról tölt fel képet.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">9. Szellemi tulajdon</h2>
      <p>
        A FitFlip márkanév, logó, weboldal-design és szoftver-implementáció a Szolgáltató szellemi tulajdona. A Felhasználó által feltöltött képek a Felhasználó tulajdonában maradnak; ezeket a Szolgáltató kizárólag a Szolgáltatás nyújtása céljából használja az Adatvédelmi nyilatkozatban leírtak szerint.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">10. Felelősség korlátozása</h2>
      <p>
        A Szolgáltatás „as is" (jelenlegi állapotában) áll rendelkezésre. A Szolgáltató nem garantálja az azonosítás és árbecslés pontosságát; ezek tájékoztató adatok. A Szolgáltató kizárja a felelősségét a Szolgáltatás használatából eredő közvetett vagy következményi károkért, kivéve a jogszabály által kötelezően előírt eseteket. A felelősség mértéke nem haladhatja meg a Felhasználó által az adott hónapban fizetett előfizetési díjat.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">11. Adatkezelés</h2>
      <p>
        A Felhasználó személyes adatainak kezelésével kapcsolatos részletes információkat az{" "}
        <a href="/privacy" className="underline hover:text-ink-700">Adatvédelmi nyilatkozat</a> tartalmazza.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">12. Panaszkezelés és vitarendezés</h2>
      <p>
        Panasz esetén a Felhasználó a support@fitflip.app email címen léphet kapcsolatba a Szolgáltatóval. A Szolgáltató a panaszra 30 napon belül érdemi választ ad.
      </p>
      <p>
        Fogyasztói jogvita esetén a Felhasználó jogosult a lakóhelye szerint illetékes Békéltető Testülethez fordulni. A Szolgáltató székhelye szerint illetékes Békéltető Testület: Budapesti Békéltető Testület, 1016 Budapest, Krisztina krt. 99., email: bekelteto.testulet@bkik.hu.
      </p>
      <p>
        Online Vitarendezési platform (EU): <a href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer" className="underline">https://ec.europa.eu/odr</a>
      </p>
      <p>
        Fogyasztóvédelmi hatóság: Budapest Főváros Kormányhivatala, Fogyasztóvédelmi Főosztály.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">13. ÁSZF módosítása</h2>
      <p>
        A Szolgáltató fenntartja a jogot, hogy az ÁSZF-et egyoldalúan módosítsa. A módosításról a Felhasználót legalább 15 nappal a hatálybalépés előtt értesíti email útján, illetve a weboldalon közzétett értesítéssel. Ha a Felhasználó a módosítást nem fogadja el, jogosult a szerződést a hatálybalépés napjáig felmondani.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">14. Irányadó jog</h2>
      <p>
        Jelen ÁSZF-re és a Felek között létrejött szerződésre Magyarország joga az irányadó. A jelen ÁSZF-ben nem szabályozott kérdésekben a Polgári Törvénykönyvről szóló 2013. évi V. törvény, a fogyasztó és a vállalkozás közötti szerződések részletes szabályairól szóló 45/2014. (II. 26.) Korm. rendelet, valamint az elektronikus kereskedelmi szolgáltatásokról szóló 2001. évi CVIII. törvény rendelkezései az irányadók.
      </p>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <h2 className="text-lg font-semibold mt-8 mb-2">1. Service Provider</h2>
      <p>
        Name: Kutak Balázs e.v.<br />
        Registered address: 1222 Budapest, Bárány utca 3., Hungary<br />
        Tax ID: 59900490-2-43<br />
        Email: support@fitflip.app<br />
        Website: https://fitflip.app
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">2. General</h2>
      <p>
        These Terms and Conditions (the &quot;Terms&quot;) govern your use of the FitFlip online service (the &quot;Service&quot;) operated by Kutak Balázs e.v. (the &quot;Provider&quot;). By using the Service you accept these Terms and the Privacy Policy.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">3. The Service</h2>
      <p>
        FitFlip is an AI-powered identification service that analyses user-uploaded photographs to identify sneakers, vintage clothing and streetwear items, and provides estimated market values together with comparable live listings.
      </p>
      <p>
        All values and market data are estimates for informational purposes only and do not constitute financial advice or a guarantee. Actual sale prices may differ.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">4. Registration and contract formation</h2>
      <p>
        Use of the Service requires registration with an email address and password, or sign-in with a Google account. Registration creates an electronic contract in Hungarian language between the user and the Provider, which is not considered a written contract and is not filed by the Provider.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">5. Plans and prices</h2>
      <p>
        <strong>Free plan:</strong> 3 scans per day, basic features.<br />
        <strong>Premium plan:</strong> HUF 1,490 / month (gross; the Provider applies the Hungarian small-business VAT exemption), unlimited scans and live listings (Vinted, Jófogás, eBay).
      </p>
      <p>
        The Premium subscription renews automatically each month via the user&apos;s registered payment method until cancelled. Payments are processed by Stripe Payments Europe Ltd. (Ireland); the Provider does not store card data.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">6. Cancellation</h2>
      <p>
        You may cancel your subscription at any time via the &quot;Manage subscription&quot; portal in your account. Cancellation takes effect at the end of the current billing cycle; no refunds are provided for unused time within an already-paid period.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">7. Right of withdrawal (14 days)</h2>
      <p>
        Under Hungarian Government Decree 45/2014 (II. 26.) implementing Directive 2011/83/EU on consumer rights, you have the right to withdraw from the contract within 14 days of conclusion, without giving any reason.
      </p>
      <p>
        <strong>Loss of the right of withdrawal:</strong> The Service is a digital service whose provision begins, with your prior express consent, before the 14-day period expires. By purchasing a subscription you expressly consent to immediate performance and acknowledge that you thereby lose your right of withdrawal once performance has begun, pursuant to § 29(1)(m) of Decree 45/2014.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">8. User obligations</h2>
      <p>You agree to use the Service only for lawful purposes and to:</p>
      <ul className="list-disc pl-6 my-2">
        <li>not upload content that is illegal or infringes the rights of others,</li>
        <li>not attempt to reverse-engineer, manipulate or overload the Service,</li>
        <li>not share account access with third parties,</li>
        <li>upload only photographs of items you actually own or intend to acquire.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">9. Intellectual property</h2>
      <p>
        The FitFlip brand, logo, website design and software implementation are the intellectual property of the Provider. Photographs uploaded by users remain the property of the user; the Provider uses them solely to provide the Service as described in the Privacy Policy.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">10. Limitation of liability</h2>
      <p>
        The Service is provided on an &quot;as is&quot; basis. The Provider does not warrant the accuracy of identifications or price estimates; these are informational only. The Provider excludes liability for indirect or consequential damages arising from use of the Service to the extent permitted by law. In any event, the Provider&apos;s total liability shall not exceed the subscription fee paid for the month in which the claim arose.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">11. Data processing</h2>
      <p>
        Detailed information on the processing of your personal data is set out in the{" "}
        <a href="/privacy" className="underline hover:text-ink-700">Privacy Policy</a>.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">12. Complaints and dispute resolution</h2>
      <p>
        For complaints, please contact the Provider at support@fitflip.app. The Provider will respond substantively within 30 days.
      </p>
      <p>
        Hungarian consumers may turn to the competent Conciliation Board (Békéltető Testület) of their place of residence. The board competent for the Provider&apos;s seat is the Budapest Conciliation Board, 1016 Budapest, Krisztina krt. 99., email: bekelteto.testulet@bkik.hu.
      </p>
      <p>
        EU Online Dispute Resolution platform: <a href="https://ec.europa.eu/odr" target="_blank" rel="noopener noreferrer" className="underline">https://ec.europa.eu/odr</a>
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">13. Amendments</h2>
      <p>
        The Provider may amend these Terms unilaterally. Users will be notified by email and via the website at least 15 days before any amendment takes effect. If you do not accept the amendment, you are entitled to terminate the contract before the effective date.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">14. Governing law</h2>
      <p>
        These Terms and any contract between the parties are governed by the laws of Hungary. Matters not regulated herein are governed by Act V of 2013 on the Civil Code, Government Decree 45/2014 (II. 26.) on consumer contracts, and Act CVIII of 2001 on electronic commerce services.
      </p>
    </>
  );
}

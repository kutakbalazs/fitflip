"use client";

import LegalShell from "@/components/LegalShell";

export default function DeleteAccountPage() {
  return (
    <LegalShell
      titleHu="Fiók és adatok törlése"
      titleEn="Account & Data Deletion"
      effectiveDate="2026-06-30"
    >
      {(lang) => (lang === "hu" ? <ContentHu /> : <ContentEn />)}
    </LegalShell>
  );
}

function ContentHu() {
  return (
    <>
      <p>
        Ezen az oldalon elmagyarázzuk, hogyan törölheted a FitFlip-fiókodat és a hozzá tartozó adatokat. A fiók törlése bármikor kezdeményezhető, és véglegesen eltávolítja az adataidat (lásd lentebb).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">A fiók törlése az appban / weben</h2>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Jelentkezz be a <a href="https://www.fitflip.app" className="underline">www.fitflip.app</a> oldalon, vagy nyisd meg a FitFlip appot.</li>
        <li>Nyisd meg a menüt, és lépj a <strong>Fiók</strong> oldalra.</li>
        <li>Görgs le a <strong>„Fiók törlése"</strong> ponthoz, és erősítsd meg a törlést.</li>
      </ol>

      <h2 className="text-lg font-semibold mt-8 mb-2">Mely adatok törlődnek</h2>
      <p>A fiók törlésekor véglegesen és visszavonhatatlanul töröljük:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>a fiókodat (email-cím, profiladatok),</li>
        <li>az összes scan-előzményedet,</li>
        <li>az általad feltöltött képeket.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">Előfizetések</h2>
      <p>
        A fiók törlése <strong>nem</strong> mondja le automatikusan az App Store-on vagy a Google Play-en kötött előfizetésedet — azt a készüléked előfizetés-beállításaiban külön kell lemondanod.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">Megőrzött adatok</h2>
      <p>
        Számviteli bizonylatokat (pl. számlák) a jogszabályi megőrzési kötelezettség miatt a törlés után is megőrzünk a kötelező időtartamig (8 év). Ezek nem használhatók fel marketingre vagy profilalkotásra.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">Nem tudsz belépni?</h2>
      <p>
        Ha nem éred el a fiókodat, kérheted a törlést emailben a <a href="mailto:support.fitflip@gmail.com" className="underline">support.fitflip@gmail.com</a> címen. A kérést a fiókhoz tartozó email-címről küldd, és 30 napon belül feldolgozzuk.
      </p>
    </>
  );
}

function ContentEn() {
  return (
    <>
      <p>
        This page explains how to delete your FitFlip account and the data associated with it. You can request deletion at any time; it permanently removes your data (see below).
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">Delete your account in the app / on the web</h2>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Sign in at <a href="https://www.fitflip.app" className="underline">www.fitflip.app</a>, or open the FitFlip app.</li>
        <li>Open the menu and go to the <strong>Account</strong> page.</li>
        <li>Scroll to <strong>&ldquo;Delete account&rdquo;</strong> and confirm the deletion.</li>
      </ol>

      <h2 className="text-lg font-semibold mt-8 mb-2">What data is deleted</h2>
      <p>When you delete your account, we permanently and irreversibly delete:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>your account (email address, profile data),</li>
        <li>all of your scan history,</li>
        <li>the photos you uploaded.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-8 mb-2">Subscriptions</h2>
      <p>
        Deleting your account does <strong>not</strong> automatically cancel a subscription purchased through the App Store or Google Play — you must cancel that separately in your device&rsquo;s subscription settings.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">Retained data</h2>
      <p>
        Accounting records (e.g. invoices) are retained after deletion for the statutory period required by law (8 years). These are not used for marketing or profiling.
      </p>

      <h2 className="text-lg font-semibold mt-8 mb-2">Can&rsquo;t sign in?</h2>
      <p>
        If you cannot access your account, you can request deletion by email at <a href="mailto:support.fitflip@gmail.com" className="underline">support.fitflip@gmail.com</a>. Send the request from the email address associated with the account, and we will process it within 30 days.
      </p>
    </>
  );
}

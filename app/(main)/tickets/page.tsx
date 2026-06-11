const PAY_LINK = "https://betaalverzoek.rabobank.nl/betaalverzoek/?id=ideLfpUOTqewT9jmKhzssg";

export default function TicketsPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Tickets</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Doe mee met de Ronnie LAN Party 2026 — regel je ticket in één minuut.
      </p>

      <div className="max-w-xl rounded-xl border border-slate-700 bg-slate-800 p-7">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-base font-extrabold uppercase tracking-wide">LAN Party 2026</h3>
          <div className="text-2xl font-extrabold text-lime-400">€ 35,00</div>
        </div>
        <ul className="mb-6 space-y-1.5 text-[13px] text-slate-300">
          <li>✔ Toegang tot de hele LAN inclusief alle toernooien</li>
          <li>✔ Eigen plek — kies je stoel via het seatplan</li>
          <li>✔ Betalen kan met elke bank in Nederland (iDEAL)</li>
        </ul>
        <a
          href={PAY_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded bg-lime-400 px-5 py-2.5 text-sm font-extrabold uppercase tracking-wide text-lime-950 hover:bg-lime-300"
        >
          Betaal € 35,00 via Rabobank
        </a>
        <p className="mt-4 text-xs text-slate-500">
          Je wordt doorgestuurd naar een officieel Rabobank-betaalverzoek.
          Vermeld bij de betaling je naam, dan zet de organisatie je op de deelnemerslijst.
        </p>
      </div>
    </div>
  );
}

export default function ContactPage() {
  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Contact</h2>
      <p className="mb-5 text-[13px] text-slate-400">
        Vragen over de Ronnie LAN Party, aanmeldingen of sponsoring?
      </p>

      <div className="grid max-w-3xl grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3.5">
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Organisatie</div>
          Spreek de organisatie aan op de LAN of stuur een bericht in de groepschat.
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Aanmelden</div>
          Meld je team of jezelf aan bij de organisatie — vermeld spel en naam.
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-800 p-4 text-[13px] leading-relaxed">
          <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Locatie</div>
          RLP26 main stage — tijden volgen via het schedule.
        </div>
      </div>
    </div>
  );
}

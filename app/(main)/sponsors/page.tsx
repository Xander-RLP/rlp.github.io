import Link from "next/link";

export default function SponsorsPage() {
  return (
    <div>
      <h2 className="mb-1.5 text-[22px] font-extrabold uppercase tracking-wide">Sponsors</h2>
      <p className="mb-5 text-[13px] text-slate-400">RLP26 zoekt nog sponsors!</p>

      <div className="max-w-xl rounded-md border border-dashed border-slate-700 bg-slate-800 p-7 text-center">
        <div className="mb-2 text-3xl">🤝</div>
        <h3 className="mb-2 text-base font-extrabold">Jouw logo hier?</h3>
        <p className="mb-4 text-[13px] leading-relaxed text-slate-400">
          We zoeken sponsors voor de Ronnie LAN Party 2026 — denk aan prijzen voor de
          prize pool, hardware of een bijdrage aan de organisatie. Groot of klein,
          alles is welkom en je staat met naam en logo op deze site.
        </p>
        <Link
          href="/contact"
          className="inline-block rounded bg-lime-400 px-4 py-2 text-xs font-bold uppercase tracking-wide text-lime-950 hover:bg-lime-300"
        >
          Word sponsor
        </Link>
      </div>
    </div>
  );
}

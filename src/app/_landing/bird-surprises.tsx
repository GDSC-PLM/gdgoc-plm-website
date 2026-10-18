const orbitSparks = [
  "top-0 left-1/2 bg-[#4285f4]",
  "top-1/2 right-0 bg-[#ea4335]",
  "bottom-0 left-1/2 bg-[#fbbc04]",
  "top-1/2 left-0 bg-[#34a853]",
] as const;

const foldSparks = [
  "top-[38%] left-[38%] motion-safe:group-data-[glints=on]/sky:-translate-x-3 motion-safe:group-data-[glints=on]/sky:-translate-y-3",
  "top-[24%] left-[57%] motion-safe:group-data-[glints=on]/sky:translate-x-2 motion-safe:group-data-[glints=on]/sky:-translate-y-4",
  "top-[65%] left-[73%] motion-safe:group-data-[glints=on]/sky:translate-x-4 motion-safe:group-data-[glints=on]/sky:translate-y-2",
] as const;

export function BirdSurprises() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -inset-x-10 -inset-y-5 rounded-full bg-[radial-gradient(ellipse,var(--lavender)_0%,transparent_68%)] opacity-[0.08]" data-bird-halo />
      <div className="absolute -inset-3 opacity-0 transition-opacity duration-400 group-data-[reward=orbit]/sky:group-data-[reward-phase=active]/sky:opacity-90 motion-safe:rotate-0 motion-safe:transition-[opacity,rotate] motion-safe:duration-[400ms,1600ms] motion-safe:ease-[cubic-bezier(0.45,0,0.55,1)] motion-safe:group-data-[reward-phase=active]/sky:rotate-360 motion-safe:group-data-[reward-phase=fade]/sky:rotate-360" data-bird-orbit>
        {orbitSparks.map((position) => (
          <span className={`absolute size-1.5 -translate-1/2 rounded-full shadow-[0_0_12px_currentColor] ${position}`} key={position} />
        ))}
      </div>
      {foldSparks.map((position) => (
        <span className={`absolute z-20 size-1 rounded-full bg-(--star-yellow) opacity-0 transition-opacity duration-200 group-data-[glints=on]/sky:opacity-80 motion-safe:scale-50 motion-safe:transition-[opacity,translate,scale] motion-safe:group-data-[glints=on]/sky:scale-100 ${position}`} key={position} data-bird-glint />
      ))}
    </div>
  );
}

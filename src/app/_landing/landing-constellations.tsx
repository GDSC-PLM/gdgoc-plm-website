import { cn } from "@/lib/utils";

const constellations = [
  {
    side: "left",
    position: "top-[32%] left-[7%] max-md:top-[32%] max-md:-left-[18%]",
    points: [[20, 55], [72, 30], [126, 76], [162, 46], [150, 147], [97, 161], [51, 135], [86, 221], [140, 207]],
    edges: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [6, 1], [5, 7], [7, 8], [8, 4]],
    draw: "motion-safe:group-data-[constellation=left-draw]/sky:[stroke-dashoffset:0] motion-safe:group-data-[constellation=left-draw]/sky:opacity-65 motion-safe:group-data-[constellation=left-draw]/sky:transition-[stroke-dashoffset,opacity] motion-safe:group-data-[constellation=left-draw]/sky:duration-900",
    fade: "motion-safe:group-data-[constellation=left-fade]/sky:[stroke-dashoffset:0] motion-safe:group-data-[constellation=left-fade]/sky:transition-opacity motion-safe:group-data-[constellation=left-fade]/sky:duration-1800 motion-safe:group-data-[constellation=left-fade]/sky:delay-0",
  },
  {
    side: "right",
    position: "top-[36%] right-[7%] max-md:top-[38%] max-md:-right-[18%]",
    points: [[18, 110], [54, 60], [102, 70], [145, 28], [156, 122], [120, 175], [75, 155], [42, 212], [109, 224]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 2], [4, 5], [5, 6], [6, 0], [6, 7], [7, 8]],
    draw: "motion-safe:group-data-[constellation=right-draw]/sky:[stroke-dashoffset:0] motion-safe:group-data-[constellation=right-draw]/sky:opacity-65 motion-safe:group-data-[constellation=right-draw]/sky:transition-[stroke-dashoffset,opacity] motion-safe:group-data-[constellation=right-draw]/sky:duration-900",
    fade: "motion-safe:group-data-[constellation=right-fade]/sky:[stroke-dashoffset:0] motion-safe:group-data-[constellation=right-fade]/sky:transition-opacity motion-safe:group-data-[constellation=right-fade]/sky:duration-1800 motion-safe:group-data-[constellation=right-fade]/sky:delay-0",
  },
] as const;

const lineDelays = ["motion-safe:delay-0", "motion-safe:delay-100", "motion-safe:delay-200", "motion-safe:delay-300", "motion-safe:delay-400", "motion-safe:delay-500", "motion-safe:delay-600", "motion-safe:delay-700", "motion-safe:delay-800", "motion-safe:delay-900"] as const;

export function LandingConstellations() {
  return <>
    {constellations.map(({ side, position, points, edges, draw, fade }) => (
    <svg
      viewBox="0 0 180 240"
      className={cn("absolute h-auto w-[clamp(7rem,13vw,12rem)] text-(--lavender) opacity-40 transition-opacity duration-400 max-md:w-32 max-md:opacity-20", position, side === "left" && "group-data-[reward=code]/sky:opacity-0")}
      fill="none"
      aria-hidden="true"
      data-constellation-art={side}
      key={side}
    >
      {edges.map(([from, to], index) => {
        const [x1, y1] = points[from];
        const [x2, y2] = points[to];
        const d = `M${x1} ${y1}L${x2} ${y2}`;

        return (
          <g key={index}>
            <path d={d} stroke="currentColor" strokeWidth="0.7" opacity="0.25" />
            <path
              d={d}
              pathLength="1"
              stroke="currentColor"
              strokeWidth="0.9"
              className={cn("[stroke-dasharray:1] [stroke-dashoffset:1] opacity-0 motion-safe:ease-in-out", draw, fade, lineDelays[index])}
              data-constellation-line
            />
          </g>
        );
      })}
      {points.map(([cx, cy], index) => (
        <circle cx={cx} cy={cy} r={index % 3 === 0 ? 2.5 : 1.6} fill="currentColor" opacity="0.45" key={index} />
      ))}
    </svg>
    ))}
    <svg viewBox="0 0 180 240" fill="none" aria-hidden="true" className="absolute top-[32%] left-[7%] h-auto w-[clamp(7rem,13vw,12rem)] text-(--lavender) opacity-0 transition-opacity duration-400 group-data-[reward=code]/sky:opacity-65 group-data-[reward-phase=fade]/sky:opacity-0 max-md:top-[20%] max-md:left-2 max-md:w-24" data-code-constellation>
      {["M60 70L30 100L60 130", "M100 60L80 140", "M120 70L150 100L120 130"].map((d, index) => (
        <path d={d} key={d} pathLength="1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" className={cn("[stroke-dasharray:1] [stroke-dashoffset:0] motion-safe:[stroke-dashoffset:1] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-900 motion-safe:group-data-[reward-phase=active]/sky:[stroke-dashoffset:0] motion-safe:group-data-[reward-phase=fade]/sky:[stroke-dashoffset:0]", lineDelays[index])} />
      ))}
      {[[60,70],[30,100],[60,130],[100,60],[80,140],[120,70],[150,100],[120,130]].map(([cx,cy]) => <circle cx={cx} cy={cy} r="2" fill="currentColor" key={`${cx}-${cy}`} />)}
    </svg>
  </>;
}

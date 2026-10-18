import { cn } from "@/lib/utils";

const birdPaths = {
  backFold: "M97.2131 141.184L180.182 116L86.5346 209.657L97.2131 141.184Z",
  rearWing: "M137.738 163.581L218.538 124.56L80.2244 26.6874L89.8685 52.4787L137.738 163.581Z",
  tail: "M99.5058 139.415L63.1136 153.354L8.82924e-06 213.523L86.4648 209.665L99.5058 139.415Z",
  body: "M243.469 58.5205L240.055 77.4711L257.383 90.3729L215.786 158.29L181.979 114.002L62.9782 153.387L243.469 58.5205Z",
  beak: "M280.36 91.9918L310.124 134.054L262.821 94.3481L280.36 91.9918Z",
  head: "M280.282 91.9603L272.459 70.5273L243.41 58.4139L239.994 77.5593L262.755 94.3127L280.282 91.9603Z",
  frontWing: "M118.06 172.857L215.779 158.414L133.779 14.379L131.076 41.6248L118.06 172.857Z",
} as const;

const drawingDelays = [
  "motion-safe:delay-0",
  "motion-safe:delay-70",
  "motion-safe:delay-140",
  "motion-safe:delay-210",
  "motion-safe:delay-280",
  "motion-safe:delay-350",
  "motion-safe:delay-420",
] as const;

export function OrigamiBird() {
  return (
    <svg
      viewBox="0 0 320.473 237.833"
      width="320.473"
      height="237.833"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="block h-auto w-[94.9%] -scale-y-100 rotate-[175.62deg] overflow-visible select-none"
      data-origami-bird
    >
      <g opacity="0.71" className="motion-safe:animate-in motion-safe:fade-in motion-safe:fill-mode-backwards motion-safe:delay-1000 motion-safe:duration-650 motion-safe:group-data-[entered=true]/sky:animate-none" data-bird-fill>
        <path d={birdPaths.backFold} fill="url(#bird-paint-0)" />
        {/* Fold origins use the original SVG coordinates, so resizing keeps the hinges attached. */}
        <g
          className="origin-[178.14px_144.07px] [transform-box:view-box] motion-safe:transition-transform motion-safe:duration-(--fold-duration) motion-safe:ease-(--bird-ease) motion-safe:group-data-[pose=drift-up]/bird:-rotate-2 motion-safe:group-data-[pose=drift-down]/bird:rotate-2 motion-safe:group-data-[pose=flutter]/bird:-rotate-3 motion-safe:group-data-[pose=tap]/bird:-rotate-4 motion-safe:group-data-[pose=hop]/bird:-rotate-5 motion-safe:group-data-[pose=stretch]/bird:-rotate-7 motion-safe:group-data-[reward=orbit]/sky:-rotate-7 group-data-[motion=off]/bird:transition-none"
          data-bird-part="rear-wing"
        >
          <g filter="url(#bird-filter-0)">
            <path d={birdPaths.rearWing} fill="url(#bird-paint-1)" />
          </g>
        </g>
        <g
          className="origin-[99.51px_139.42px] [transform-box:view-box] motion-safe:transition-transform motion-safe:duration-(--fold-duration) motion-safe:delay-150 motion-safe:ease-(--bird-ease) motion-safe:group-data-[pose=drift-up]/bird:rotate-[0.75deg] motion-safe:group-data-[pose=drift-down]/bird:-rotate-[0.75deg] motion-safe:group-data-[pose=flutter]/bird:rotate-2 motion-safe:group-data-[pose=tap]/bird:rotate-2 motion-safe:group-data-[pose=hop]/bird:-rotate-2 motion-safe:group-data-[pose=stretch]/bird:rotate-2 motion-safe:group-data-[attention=tail]/bird:rotate-3 motion-safe:group-data-[pose=settle]/bird:-rotate-[0.5deg] group-data-[motion=off]/bird:transition-none"
          data-bird-part="tail"
        >
          <g filter="url(#bird-filter-1)">
            <path d={birdPaths.tail} fill="#C4667C" />
          </g>
        </g>
        <g filter="url(#bird-filter-2)" data-bird-part="body">
          <path d={birdPaths.body} fill="url(#bird-paint-2)" />
        </g>
        <g className="origin-[243.41px_77.56px] [transform-box:view-box] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-data-[attention=head]/bird:rotate-4 group-data-[motion=off]/bird:transition-none" data-bird-part="head">
          <g filter="url(#bird-filter-3)">
            <path d={birdPaths.beak} fill="url(#bird-paint-3)" />
          </g>
          <g filter="url(#bird-filter-4)">
            <path d={birdPaths.head} fill="url(#bird-paint-4)" />
          </g>
        </g>
        <g
          className="origin-[166.92px_165.64px] [transform-box:view-box] motion-safe:transition-transform motion-safe:duration-(--fold-duration) motion-safe:ease-(--bird-ease) motion-safe:group-data-[pose=drift-up]/bird:rotate-3 motion-safe:group-data-[pose=drift-down]/bird:-rotate-2 motion-safe:group-data-[pose=flutter]/bird:rotate-4 motion-safe:group-data-[pose=tap]/bird:rotate-6 motion-safe:group-data-[pose=hop]/bird:rotate-7 motion-safe:group-data-[pose=stretch]/bird:rotate-9 motion-safe:group-data-[reward=orbit]/sky:rotate-9 group-data-[motion=off]/bird:transition-none"
          data-bird-part="front-wing"
        >
          <g filter="url(#bird-filter-5)">
            <path d={birdPaths.frontWing} fill="url(#bird-paint-5)" />
          </g>
        </g>
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="0.85"
        strokeLinejoin="round"
        className="text-(--lavender) opacity-0 motion-safe:transition-opacity motion-safe:duration-350 motion-safe:group-data-[paper=tracing]/sky:opacity-60"
        data-bird-drawing
      >
        {Object.values(birdPaths).map((d, index) => (
          <path
            d={d}
            pathLength="1"
            vectorEffect="non-scaling-stroke"
            className={cn(
              "[stroke-dasharray:1] [stroke-dashoffset:1] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-900 motion-safe:ease-out motion-safe:group-data-[paper=tracing]/sky:[stroke-dashoffset:0] motion-safe:group-data-[paper=filled]/sky:[stroke-dashoffset:0]",
              drawingDelays[index],
            )}
            key={index}
          />
        ))}
      </g>
      <defs>
        <filter id="bird-filter-0" x="80.2244" y="25.7601" width="138.844" height="137.821" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="0.529914" dy="-0.92735" />
          <feGaussianBlur stdDeviation="0.993589" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter id="bird-filter-1" x="8.82924e-06" y="139.15" width="101.228" height="74.3729" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="1.72222" dy="-0.264957" />
          <feGaussianBlur stdDeviation="0.993589" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter id="bird-filter-2" x="62.9782" y="58.388" width="194.405" height="99.9016" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="-0.132479" />
          <feGaussianBlur stdDeviation="0.331196" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter id="bird-filter-3" x="262.821" y="91.9918" width="47.3036" height="42.0619" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset />
          <feGaussianBlur stdDeviation="0.331196" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter id="bird-filter-4" x="239.862" y="58.4139" width="40.4205" height="35.8988" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="-0.132479" />
          <feGaussianBlur stdDeviation="0.192094" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
        <filter id="bird-filter-5" x="115.874" y="11.6632" width="102.621" height="163.38" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="0.264957" dy="-0.264957" />
          <feGaussianBlur stdDeviation="1.22543" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
        </filter>
        <linearGradient id="bird-paint-0" x1="176.607" y1="233.557" x2="107.092" y2="144.275" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="1" stopColor="#AD6DA3" />
        </linearGradient>
        <linearGradient id="bird-paint-1" x1="172.289" y1="154.556" x2="135.14" y2="12.3425" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="0.427885" stopColor="#AB9ED9" /><stop offset="0.759615" stopColor="#8A78CA" />
        </linearGradient>
        <linearGradient id="bird-paint-2" x1="234.378" y1="157.807" x2="89.5165" y2="69.8004" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="0.162918" stopColor="#B6BDEC" /><stop offset="0.25235" stopColor="#A0A9E6" /><stop offset="0.441377" stopColor="#7C88DC" /><stop offset="0.746041" stopColor="#717ED9" />
        </linearGradient>
        <linearGradient id="bird-paint-3" x1="302.386" y1="139.602" x2="291.532" y2="96.3211" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="1" stopColor="#7D7CD3" />
        </linearGradient>
        <linearGradient id="bird-paint-4" x1="273.977" y1="106.822" x2="264.006" y2="65.6877" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="1" stopColor="#6681E0" />
        </linearGradient>
        <linearGradient id="bird-paint-5" x1="202.133" y1="186.225" x2="135.976" y2="18.2093" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" /><stop offset="0.557692" stopColor="#A99AD7" /><stop offset="1" stopColor="#8C78C9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

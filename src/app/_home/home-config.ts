export type GameDetails = {
  cover: string;
  coverWidth: number;
  coverHeight: number;
  description: string;
  instructions: readonly string[];
  playUrl: string;
};

export type HomeGame = {
  id: string;
  title: string;
  description: string;
  creator: string;
  icon: string;
  iconClass: string;
  details?: GameDetails;
};

export const homeGames: readonly HomeGame[] = [
  {
    id: "flappy-haribot",
    title: "Flappy Haribot",
    description: "Help Haribot fly through obstacles",
    creator: "Gamedev name",
    icon: "/home/games/logo-flappy-haribot.png",
    iconClass: "top-[-14%] left-[-3.1%] h-[145.49%] w-[118.77%]",
    details: {
      cover: "/home/flappy-details/cover-image-flappy-haribot.png",
      coverWidth: 1406,
      coverHeight: 632,
      description:
        "Developed using vanilla JavaScript, HTML5, and CSS, the game adapts the classic Flappy Bird formula which requires players to navigate a flying character through obstacles. They can collect or avoid falling items that directly alter their state, such as gaining point boosts, taking point penalties, shrinking the  size, or triggering temporary invincibility.",
      instructions: [
        "Press Space or tap the screen to make Haribot flap.",
        "Navigate through gaps between the cosmic pipes.",
        "Earn points for every pipe cleared. Beat the leaderboard!",
      ],
      playUrl: "https://flappy-haribon.vercel.app/",
    },
  },
  {
    id: "matching-game",
    title: "Matching Game",
    description: "Flip through cards and test your memory",
    creator: "Gamedev name",
    icon: "/home/games/logo-matching-game.png",
    iconClass: "top-[-4.29%] left-[-0.47%] h-[131.65%] w-[115.56%]",
    details: {
      cover: "/home/matching-details/cover-image-matching-game.png",
      coverWidth: 1297,
      coverHeight: 727,
      description:
        "Coded in Godot and exported as an HTML5 web game, the game features a standard grid of face down cards that players flip over two at a time to find matching pairs. It is customized for the organization by using  vector designs of the GDGoC mascots as the matching card icons. The game was designed for the 2025-2026 General Assembly of GDGoC.",
      instructions: [
        "Click any card to flip it and select a second card to find its pair.",
        "If the cards match, they stay face up; if not, they flip back down.",
        "Uncover all mascot pairs in as few turns as possible!",
      ],
      playUrl: "https://thunderbot99.github.io/GDGoC-Matching/",
    },
  },
  {
    id: "perch-party",
    title: "Perch Party",
    description: "Short description for future game",
    creator: "Gamedev name",
    icon: "/home/games/logo-perch-party.png",
    iconClass: "top-[5.97%] left-[-1.76%] h-[113.04%] w-[117.28%]",
  },
  {
    id: "extra-game",
    title: "Extra Game",
    description: "Short description for future game",
    creator: "Gamedev name",
    icon: "/home/games/logo-extra-game.png",
    iconClass: "top-[-4.3%] left-[-9.9%] h-[130.43%] w-[120%]",
  },
];

export type BoardGroup = "executives" | "deputies";

export type BoardMember = {
  id: string;
  name: string;
  role: string;
  portrait: string;
  back: string;
};

const executiveBacks = ["", "1", "2", "2", "2", "3"] as const;

export const boardMembers: Record<BoardGroup, readonly BoardMember[]> = {
  executives: executiveBacks.map((suffix, index) => ({
    id: `executive-${index + 1}`,
    name: "Mariebethel Roussamiere Miranda",
    role: "Chief Executive Officer",
    portrait: "/home/executive-face/img-executive.jpg",
    back: `/home/board/card-executive-unflipped${suffix}.svg`,
  })),
  deputies: executiveBacks.map((_, index) => ({
    id: `deputy-${index + 1}`,
    name: "Mariebethel Roussamiere Miranda",
    role: "Chief Executive Officer",
    portrait: "/home/executive-face/img-executive.jpg",
    back: "",
  })),
};

export const homeHeadingClass =
  "font-(family-name:--font-landing) text-[clamp(1.875rem,3vw,2.75rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-[#eeeaf7]";

export const homeButtonClass =
  "inline-flex min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center rounded-full bg-[#b6a1dc] px-6 py-3 font-(family-name:--font-landing) text-base text-center font-semibold text-[#121212] transition-colors hover:bg-[#cbb9e8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fbe29b]";

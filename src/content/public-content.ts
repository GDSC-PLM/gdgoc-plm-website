export type ContentKind = "events" | "blogs" | "projects";

export type ContentEntry = {
  slug: string;
  title: string;
  description: string;
  art: string;
  body: readonly { heading: string; text: string }[];
  date?: string;
  time?: string;
  venue?: string;
  author?: string;
  demoUrl?: string | null;
  sourceUrl?: string | null;
  registrationUrl?: string | null;
};
export const events: readonly ContentEntry[] = [
  {
    slug: "innolympics-2026",
    title: "InnOlympics 2026",
    date: "March 18, 2026",
    time: "9:00 AM – 5:00 PM",
    venue: "Justo Albert Auditorium & Hybrid",
    description:
      "PLM’s premier campus-wide innovation hackathon bringing together multidisciplinary student teams to engineer impactful software solutions.",
    art: "/home/events/imgSvg1.svg",
    body: [
      {
        heading: "Event details",
        text: "Additional event details placeholder.",
      },
    ],
    registrationUrl: null,
  },
  {
    slug: "general-assembly",
    title: "General Assembly",
    date: "April 5, 2026",
    time: "1:00 PM – 4:30 PM",
    venue: "PLM Tanghalang Bayan",
    description:
      "Unite with the entire GDGoC PLM galaxy! Connect with core leads, discover semester roadmaps, and embark on upcoming community chapters.",
    art: "/home/events/imgSvg2.svg",
    body: [
      {
        heading: "Event details",
        text: "Additional event details placeholder.",
      },
    ],
    registrationUrl: null,
  },
  {
    slug: "intro-to-web-dev",
    title: "Intro to Web Dev Workshop",
    date: "April 22, 2026",
    time: "2:00 PM – 5:00 PM",
    venue: "Computer Lab 3 & Google Meet",
    description:
      "A beginner-friendly cosmic bootcamp covering modern frontend fundamentals, semantic markup, reactive styling, and deploying to Google…",
    art: "/home/events/imgSvg3.svg",
    body: [
      {
        heading: "Event details",
        text: "Additional event details placeholder.",
      },
    ],
    registrationUrl: null,
  },
];
export const posts: readonly ContentEntry[] = [
  {
    slug: "story-placeholder-1",
    title: "Placeholder Blog Title Goes Here",
    description: "Story overview placeholder.",
    author: "Author Name",
    date: "Date Placeholder",
    art: "/home/blogs/imgSvg2.svg",
    body: [{ heading: "Story", text: "Full article content placeholder." }],
  },
  {
    slug: "story-placeholder-2",
    title: "Placeholder Featured Blog Title: Overview of the Story Goes Here",
    description: "Story overview placeholder.",
    author: "Author Name",
    date: "Date Placeholder",
    art: "/home/blogs/imgSvg6.svg",
    body: [{ heading: "Story", text: "Full article content placeholder." }],
  },
  {
    slug: "story-placeholder-3",
    title: "Placeholder Blog Title Goes Here",
    description: "Story overview placeholder.",
    author: "Author Name",
    date: "Date Placeholder",
    art: "/home/blogs/imgSvg10.svg",
    body: [{ heading: "Story", text: "Full article content placeholder." }],
  },
];
export const projects: readonly ContentEntry[] = [
  {
    slug: "project-placeholder-1",
    title: "Project Title Placeholder 1",
    description: "Project overview placeholder.",
    art: "/home/events/imgSvg1.svg",
    body: [
      { heading: "Project overview", text: "Project details placeholder." },
      { heading: "Contributors", text: "Contributor information placeholder." },
    ],
    demoUrl: null,
    sourceUrl: null,
  },
  {
    slug: "project-placeholder-2",
    title: "Project Title Placeholder 2",
    description: "Project overview placeholder.",
    art: "/home/events/imgSvg2.svg",
    body: [
      { heading: "Project overview", text: "Project details placeholder." },
      { heading: "Contributors", text: "Contributor information placeholder." },
    ],
    demoUrl: null,
    sourceUrl: null,
  },
  {
    slug: "project-placeholder-3",
    title: "Project Title Placeholder 3",
    description: "Project overview placeholder.",
    art: "/home/events/imgSvg3.svg",
    body: [
      { heading: "Project overview", text: "Project details placeholder." },
      { heading: "Contributors", text: "Contributor information placeholder." },
    ],
    demoUrl: null,
    sourceUrl: null,
  },
];
export const contactEmail = "dsc.haribon@gmail.com";
export const avp = {
  src: null as string | null,
  title: "Beyond Boundaries: Curiosity Meets Code",
};
export const mission =
  "To empower PLM students by creating an inclusive space where aspiring tech leaders, designers, and developers learn cutting-edge Google technologies, build impactful community projects, and bridge academic theory with real-world industry practice.";
export const vision =
  "To become a premier student-led innovation hub in the Philippines that nurtures collaborative problem-solvers who leverage modern open-source software, cloud computing, and AI to transform society.";
export const navigation = [
  "About",
  "Events",
  "Projects",
  "Blogs",
  "Games",
  "Team",
  "Partners",
  "Contact",
].map((label) => ({
  label,
  href: label === "Games" ? "/#games" : "/" + label.toLowerCase(),
}));

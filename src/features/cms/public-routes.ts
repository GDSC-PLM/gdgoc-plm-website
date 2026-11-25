export const collections = {
  events: { area: "events", title: "Events", description: "Meet, learn and build with GDGoC PLM." },
  projects: { area: "blogs", title: "Projects", description: "Explore what our community is building." },
  blogs: { area: "blogs", title: "Blogs", description: "Read stories, past event recaps and initiatives." },
  team: { area: "board", title: "Executive Board", description: "Meet the officers behind GDGoC PLM." },
  partners: { area: "partners", title: "Partners", description: "Meet the partners and sponsors who support our community." },
  zines: { area: "zines", title: "Zines", description: "Read and download issues from our community." },
  haribots: { area: "haribots", title: "Haribots", description: "Meet the Haribots." },
  faq: { area: "faq", title: "Frequently asked questions", description: "Find answers about GDGoC PLM." },
  games: { area: "games", title: "Games", description: "Discover games you can play on their official sites." },
} as const;

export type Collection = keyof typeof collections;
export const isCollection = (key: string): key is Collection => Object.hasOwn(collections, key);
export const publicPath = (item: { collection: string; slug: string }) => "/" + item.collection + "/" + item.slug;

export function articleCollection(area: string, category: unknown): Collection {
  if (area === "board") return "team";
  if (area === "blogs" && category === "project") return "projects";
  if (isCollection(area)) return area;
  throw new Error("Unrecognized content area.");
}

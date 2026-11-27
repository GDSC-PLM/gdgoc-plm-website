import Image from "next/image";
import Link from "next/link";
import { homeButtonClass, homeHeadingClass } from "./home-config";
import { mission, vision, events, posts } from "@/content/public-content";
import { ContentCard } from "@/components/shared/content-card";
import { BlogCarousel } from "./blog-carousel";
import { VideoPanel } from "./video-panel";
export const sectionClass =
  "relative isolate flex min-h-[min(720px,100dvh)] flex-col justify-center px-5 py-20 sm:px-8 lg:py-24";
export function HomeHero() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-72px)] items-center justify-center overflow-hidden px-5 py-24 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_20%,#182b50,transparent_50%),radial-gradient(ellipse_at_85%_80%,#35203a,transparent_45%)]"
      />
      <Image
        src="/home/hero/imgCurvedLightStreakSwooshSvg.svg"
        alt=""
        width={1100}
        height={380}
        loading="eager"
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 w-[min(1100px,130vw)] max-w-none -translate-x-1/2 opacity-50"
      />
      <div className="min-w-0 max-w-3xl">
        <Image
          src="/home/hero/img8PointCompassStarSvg.svg"
          alt=""
          width={80}
          height={80}
          loading="eager"
          className="mx-auto mb-8 size-16"
        />
        <h1 className="font-(family-name:--font-landing) text-5xl font-bold tracking-tight sm:text-[64px]">
          GDGoC PLM
        </h1>
        <p className="mt-5 text-sm tracking-[0.15em] sm:text-lg">
          GOOGLE DEVELOPER GROUPS ON CAMPUS
        </p>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#b5accb]">
          A community of student developers, designers, and builders at PLM,
          where curiosity meets code.
        </p>
        <Link href="/events" className={homeButtonClass + " mt-8"}>
          Explore Events{" "}
          <svg
            className="ml-3 size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M4 12h16m-6-6 6 6-6 6" />
          </svg>
        </Link>
      </div>
      <Link
        href="/contact"
        className="absolute right-5 bottom-6 rounded-full border border-white/20 px-4 py-3 text-xs text-[#b5accb]"
      >
        Here to help ↗
      </Link>
    </section>
  );
}
export function AvpSection() {
  return (
    <section className={sectionClass}>
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className={homeHeadingClass}>Meet GDGoC PLM</h2>
        <p className="mt-4 leading-relaxed text-[#b5accb]">
          Watch our official journey, our vibrant community members, and how we
          foster tech innovation on campus.
        </p>
      </div>
      <VideoPanel />
    </section>
  );
}
export function AboutSection({ showLink = true }: { showLink?: boolean }) {
  return (
    <section className={sectionClass}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div>
          <h2 className={homeHeadingClass}>Who Are We</h2>
          {[
            ["Mission", mission],
            ["Vision", vision],
          ].map(([title, copy]) => (
            <div
              key={title}
              className="mt-5 rounded-2xl border border-white/15 bg-linear-to-br from-blue-400/15 to-amber-200/5 p-6"
            >
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#b5accb]">
                {copy}
              </p>
            </div>
          ))}
          {showLink && (
            <Link href="/about" className={homeButtonClass + " mt-7"}>
              Learn More
            </Link>
          )}
        </div>
        <div
          role="img"
          aria-label="Luxie mascot artwork placeholder"
          className="relative mx-auto flex aspect-square w-full max-w-md items-end justify-center overflow-hidden rounded-3xl border border-[#b6a1dc]/30 bg-[radial-gradient(ellipse_at_50%_40%,#344c80,transparent_70%),linear-gradient(135deg,#292444,#402435)] p-6 sm:p-10"
        >
          <span className="rounded-full border border-[#fbe29b]/30 bg-[#14112b] px-4 py-2 text-xs tracking-widest text-[#fbe29b]">
            LUXIE • OFFICIAL MASCOT
          </span>
        </div>
      </div>
    </section>
  );
}
export function FeaturedEvents() {
  return (
    <section className={sectionClass}>
      <div className="mx-auto w-full max-w-5xl">
        <h2 className={homeHeadingClass + " text-center"}>Featured Events</h2>
        <p className="mx-auto mt-4 max-w-xl text-center leading-relaxed text-[#b5accb]">
          Explore flagship hackathons, technical masterclasses, and hands-on
          workshops tailored for student builders.
        </p>
        <div className="mt-10 grid gap-4">
          {events.map((entry) => (
            <ContentCard
              key={entry.slug}
              entry={entry}
              kind="events"
              horizontal
            />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/events" className={homeButtonClass}>
            Explore All Events
          </Link>
        </div>
      </div>
    </section>
  );
}
export function LatestBlogs() {
  return (
    <section className={sectionClass}>
      <div className="mx-auto w-full max-w-6xl">
        <h2 className={homeHeadingClass + " text-center"}>
          Latest Blogs &amp; Stories
        </h2>
        <p className="mx-auto mt-4 mb-10 max-w-xl text-center leading-relaxed text-[#b5accb]">
          Read technical reflections, community chronicles, and milestone
          highlights written by PLM students.
        </p>
        <BlogCarousel
          cards={posts.map((entry) => (
            <ContentCard key={entry.slug} entry={entry} kind="blogs" />
          ))}
        />
        <div className="mt-8 text-center">
          <Link href="/blogs" className={homeButtonClass}>
            See All Blogs
          </Link>
        </div>
      </div>
    </section>
  );
}

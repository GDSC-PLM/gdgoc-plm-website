import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentEntry, ContentKind } from "@/content/public-content";
import { homeHeadingClass, homeButtonClass } from "@/app/_home/home-config";
export function Destination({
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24 ${compact ? "" : "min-h-[75dvh]"}`}
    >
      <header className="mb-12 max-w-2xl">
        <p className="mb-4 text-xs tracking-widest text-[#b6a1dc]">GDGoC PLM</p>
        <h1 className={homeHeadingClass}>{title}</h1>
        <p className="mt-4 leading-relaxed text-[#b5accb]">{description}</p>
      </header>
      {children}
    </div>
  );
}
export function ContentDetail({
  entry,
  kind,
}: {
  entry: ContentEntry;
  kind: ContentKind;
}) {
  return (
    <Destination title={entry.title} description={entry.description}>
      <Link
        href={"/" + kind}
        className="mb-8 inline-block py-3 text-sm text-[#b6a1dc]"
      >
        ← Back to {kind}
      </Link>
      <div className="grid gap-10 md:grid-cols-[1fr_1.4fr]">
        <div className="grid aspect-[4/3] place-items-center rounded-3xl border border-white/15 bg-linear-to-br from-blue-400/15 to-amber-200/10">
          <Image
            src={entry.art}
            alt=""
            width={160}
            height={160}
            className="size-32 object-contain"
          />
        </div>
        <article className="space-y-6 leading-relaxed text-[#b5accb]">
          {entry.date && (
            <p>
              {entry.author ? entry.author + " · " : ""}
              {entry.date}
              {entry.time ? " · " + entry.time : ""}
            </p>
          )}
          {entry.venue && <p>{entry.venue}</p>}
          {entry.body.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-semibold text-[#eeeaf7]">
                {section.heading}
              </h2>
              <p className="mt-4">{section.text}</p>
            </section>
          ))}
          {kind !== "blogs" && (
            <div className="flex flex-wrap gap-3">
              {(kind === "events"
                ? [{ label: "Register", url: entry.registrationUrl }]
                : [
                    { label: "View demo", url: entry.demoUrl },
                    { label: "Source code", url: entry.sourceUrl },
                  ]
              ).map(({ label, url }) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={homeButtonClass}
                  >
                    {label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <button
                    key={label}
                    disabled
                    className={homeButtonClass + " opacity-50"}
                    aria-label={label + " unavailable"}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          )}
        </article>
      </div>
    </Destination>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { ContentEntry, ContentKind } from "@/content/public-content";
export function ContentCard({
  entry,
  kind,
  horizontal = false,
}: {
  entry: ContentEntry;
  kind: ContentKind;
  horizontal?: boolean;
}) {
  return (
    <Link
      href={"/" + kind + "/" + entry.slug}
      className={
        "group block min-w-0 overflow-hidden rounded-2xl border border-[#b6a1dc]/20 bg-linear-to-br from-blue-400/12 via-[#18142e] to-amber-200/8 transition-colors hover:border-[#b6a1dc]/60 " +
        (horizontal ? "md:flex md:items-center" : "")
      }
    >
      <div
        className={
          "relative grid place-items-center overflow-hidden bg-[#0e0c21] " +
          (horizontal ? "h-40 shrink-0 md:w-64" : "aspect-[4/3]")
        }
      >
        <Image
          src={entry.art}
          alt=""
          width={120}
          height={120}
          className="h-24 w-24 object-contain transition-transform group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 p-6">
        <h3 className="font-(family-name:--font-landing) text-xl font-semibold">
          {entry.title}
        </h3>
        {entry.date && (
          <p className="mt-2 text-xs leading-relaxed text-[#b5accb]">
            {entry.author ? entry.author + " · " : ""}
            {entry.date}
            {entry.time ? " · " + entry.time : ""}
          </p>
        )}
        {entry.venue && (
          <p className="mt-1 text-xs text-[#b5accb]">{entry.venue}</p>
        )}
        <p className="mt-3 text-sm leading-relaxed text-[#b5accb]">
          {entry.description}
        </p>
      </div>
    </Link>
  );
}

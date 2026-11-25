import Image from "next/image";
import Markdown, { defaultUrlTransform } from "react-markdown";

import { displayDate, httpsLink, mediaUse, type EditorArea } from "./editor-fields";
import type { CmsSnapshot } from "./server/schema";

const markdownElements = ["p", "h1", "h2", "h3", "h4", "strong", "em", "ul", "ol", "li",
  "blockquote", "code", "pre", "a", "br", "hr"];

function protectedLink(url: string) {
  const safe = defaultUrlTransform(url);
  return httpsLink(safe);
}

export function CmsMarkdown({ source }: { source: string }) {
  return (
    <div className="space-y-4 leading-relaxed [overflow-wrap:anywhere] [&_blockquote]:border-l [&_blockquote]:pl-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/15 [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-6">
      <Markdown skipHtml allowedElements={markdownElements} urlTransform={protectedLink}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ href, children }) => href
            ? <a href={href} rel="noopener noreferrer" className="underline underline-offset-4 hover:text-[#d0bcef]">{children}</a>
            : <span>{children}</span>,
        }}>
        {source}
      </Markdown>
    </div>
  );
}

export function CmsArticle({ area, snapshot, mediaRoot }: {
  area: EditorArea; snapshot: CmsSnapshot; mediaRoot: "/admin/media" | "/api/cms/media";
}) {
  const { fields } = snapshot;
  const text = (key: string) => typeof fields[key] === "string" ? fields[key] : "";
  const cover = mediaUse(fields.cover ?? fields.photo ?? fields.logo ?? null);
  const pdf = mediaUse(fields.download ?? null);
  const body = text("body") || text("bio") || text("answer") || text("description");
  const href = httpsLink(text("registrationUrl") || text("outboundUrl") || text("websiteUrl"));
  const action = area === "events" ? "Register for the event" : area === "games" ? "Open the game" : "Visit the website";
  const facts = [
    text("category")?.replaceAll("-", " "), text("statusLabel"), text("kind"), text("role"), text("issueLabel"),
  ].filter(Boolean);
  const registration = text("startsAt");

  return (
    <article className="mx-auto w-full max-w-3xl space-y-7 px-5 py-10 text-[#eeeaf7] sm:px-8 sm:py-14">
      {facts.length > 0 && <p className="text-sm text-[#d0bcef]">{facts.join(" · ")}</p>}
      <h1 className="text-4xl leading-tight font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-5xl">
        {snapshot.title || "Untitled draft"}
      </h1>
      {(registration || text("venue") || text("mode") || text("releaseDate")) && (
        <div className="space-y-1 border-y border-[#b6a1dc]/25 py-4 text-sm text-[#d0c2e8]">
          {registration && <p>Starts <time dateTime={registration}>{displayDate(registration)}</time> Manila time</p>}
          {text("endsAt") && <p>Ends <time dateTime={text("endsAt")}>{displayDate(text("endsAt"))}</time> Manila time</p>}
          {(text("mode") || text("venue")) && <p className="capitalize">{[text("mode"), text("venue")].filter(Boolean).join(" · ")}</p>}
          {text("releaseDate") && <p>Released <time dateTime={text("releaseDate")}>{text("releaseDate")}</time></p>}
        </div>
      )}
      {cover && (
        <Image unoptimized src={mediaRoot + "/" + cover.versionId} alt={cover.alt} width={960} height={540}
          className="h-auto max-h-[32rem] w-full rounded-lg border border-[#b6a1dc]/25 bg-[#151027] object-contain" />
      )}
      {body && <CmsMarkdown source={body} />}
      {text("instructions") && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">How to play</h2>
          <CmsMarkdown source={text("instructions")} />
        </section>
      )}
      {(href || pdf) && (
        <div className="flex flex-wrap gap-3">
          {href && <a href={href} rel="noopener noreferrer" className="rounded-md border border-[#b6a1dc]/40 px-4 py-3 text-sm font-semibold underline hover:bg-[#b6a1dc]/10">{action}</a>}
          {pdf && <a href={mediaRoot + "/" + pdf.versionId} className="rounded-md border border-[#b6a1dc]/40 px-4 py-3 text-sm font-semibold underline hover:bg-[#b6a1dc]/10">Download PDF</a>}
        </div>
      )}
    </article>
  );
}

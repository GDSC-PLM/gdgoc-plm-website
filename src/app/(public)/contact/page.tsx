import { Destination } from "@/components/shared/destination";
import { siteConfig, chapterUrl } from "@/lib/site-config";
import { contactEmail } from "@/content/public-content";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Contact | GDGoC PLM", "/contact"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <Destination
      title="Let’s connect"
      description="Have a question, an idea, or a collaboration in mind? Reach out to GDGoC PLM."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <a
          href={"mailto:" + contactEmail}
          className="rounded-2xl border border-white/15 bg-white/3 p-8"
        >
          <h2 className="text-xl font-semibold">Email us</h2>
          <p className="mt-4 break-all text-[#b6a1dc]">{contactEmail} ↗</p>
        </a>
        <a
          href={chapterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-white/15 bg-white/3 p-8"
        >
          <h2 className="text-xl font-semibold">Join the community</h2>
          <p className="mt-4 text-[#b6a1dc]">
            Visit our official GDG chapter ↗
          </p>
        </a>
      </div>
      <h2 className="mt-12 text-xl font-semibold">Follow our journey</h2>
      <div className="mt-5 flex flex-wrap gap-4">
        {siteConfig.socialLinks.map((s) => (
          <a
            key={s.platform}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/20 px-5 py-3"
          >
            {s.label} ↗
          </a>
        ))}
      </div>
    </Destination>
  );
}

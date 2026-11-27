import { partnerMedia } from "@/content/partner-media";
import Image from "next/image";
import Link from "next/link";
import { partners } from "@/content/partners";
import { Destination } from "@/components/shared/destination";
import { homeButtonClass } from "@/app/_home/home-config";
import { pageMetadata } from "@/lib/site-metadata";
export const metadata = {
  ...pageMetadata("Partners | GDGoC PLM", "/partners"),
  robots: { index: false, follow: true },
};
export default function Page() {
  return (
    <Destination
      title="Our partners"
      description="The companies, student communities, and organizations building with us."
    >
      <p className="mb-10 text-4xl font-semibold">
        50+{" "}
        <span className="text-base font-normal text-[#b5accb]">
          campus partners
        </span>
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-5 md:grid-cols-3 lg:grid-cols-5">
        {partners.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-white/15 bg-white/5 p-5"
          >
            <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-white">
              <Image
                src={
                  partnerMedia[p.logo as keyof typeof partnerMedia] ?? p.logo
                }
                placeholder="blur"
                alt={p.name}
                fill
                sizes="(min-width:1024px) 180px, (min-width:768px) 28vw, 42vw"
                className="object-contain p-4"
              />
            </div>
            <h2 className="text-center text-sm font-semibold">{p.name}</h2>
          </div>
        ))}
      </div>
      <Link href="/contact" className={homeButtonClass + " mt-10"}>
        Partner with us
      </Link>
    </Destination>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GDGoC PLM CMS",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-7 sm:px-8 sm:py-10">{children}</main>;
}

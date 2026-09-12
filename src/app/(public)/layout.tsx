import type { ReactNode } from "react";

import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";

type PublicLayoutProps = {
  children: ReactNode;
};

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="flex flex-1">{children}</main>
      <Footer />
    </div>
  );
}

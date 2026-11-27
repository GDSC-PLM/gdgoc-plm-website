"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { navigation } from "@/content/public-content";
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10 bg-[#090817]/95 backdrop-blur-xl"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 lg:min-h-18 lg:px-8"
      >
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 font-semibold"
          aria-label="GDGoC PLM homepage"
        >
          <Image
            src="/brand/gdg-mark.svg"
            alt=""
            width={40}
            height={40}
            loading="eager"
          />
          GDGoC PLM
        </Link>
        <button
          ref={button}
          type="button"
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
          className="min-h-11 rounded-full border border-white/20 px-5 lg:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
        <div
          id="site-navigation"
          className={
            (open ? "flex" : "hidden") +
            " max-h-[calc(100dvh-5rem)] w-full flex-col gap-1 overflow-y-auto lg:flex lg:max-h-none lg:w-auto lg:flex-row lg:overflow-visible"
          }
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={
                pathname.startsWith(item.href) && item.href !== "/#games"
                  ? "page"
                  : undefined
              }
              className="rounded-lg px-3 py-3 text-sm text-[#b5accb] hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/8 aria-[current=page]:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

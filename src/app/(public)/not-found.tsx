import Link from "next/link";
export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-28 text-center">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-4 text-[#b5accb]">
        The page you requested does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full border border-white/20 px-5 py-3"
      >
        Back to home
      </Link>
    </section>
  );
}

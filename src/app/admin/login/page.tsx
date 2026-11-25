import { signOut, startGoogleSignIn } from "../actions";

const notices: Record<string, string> = {
  denied: "Sign-in was denied. Ask a full administrator to verify your invitation and its expiry.",
  limited: "Too many sign-in attempts. Try again in one minute.",
  unavailable: "CMS sign-in is temporarily unavailable. Check the local setup and try again.",
  signout: "Sign-out could not be completed. Try again.",
};

export default async function AdminLogin({ searchParams }: PageProps<"/admin/login">) {
  const { status } = await searchParams;
  const notice = typeof status === "string" && Object.hasOwn(notices, status) ? notices[status] : null;
  return (
    <>
      <h1 className="text-3xl font-bold">Administrator sign-in</h1>
      <p>Use the Google account approved for the GDGoC PLM CMS.</p>
      {notice && <p role="status">{notice}</p>}
      <form action={startGoogleSignIn}>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Continue with Google</button>
      </form>
      {(status === "denied" || status === "signout") && (
        <form action={signOut}><button className="underline">Sign out</button></form>
      )}
    </>
  );
}

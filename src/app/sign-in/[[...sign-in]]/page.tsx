import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main className="auth-shell">
        <a className="brand-link" href="/">
          RSP
        </a>
        <section className="setup-panel">
          <p className="eyebrow">Clerk Setup</p>
          <h1>Missing Clerk keys</h1>
          <p>Add Clerk environment variables from `.env.example` to enable employee sign-in locally.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <a className="brand-link" href="/">
        RSP
      </a>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}

import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getCrewEventDashboard } from "@/lib/crew-data";
import { PrintBriefButton } from "../PrintBriefButton";

export const dynamic = "force-dynamic";

type CrewEventPageProps = {
  params: {
    gigId: string;
  };
};

export default async function CrewEventPage({ params }: CrewEventPageProps) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const { userId } = clerkEnabled ? await auth() : { userId: "local-demo-user" };

  if (clerkEnabled && !userId) {
    redirect("/sign-in");
  }

  const dashboard = await getCrewEventDashboard(userId ?? "local-demo-user", params.gigId);

  if (!dashboard) {
    notFound();
  }

  return (
    <main className="crew-app">
      <aside className="crew-rail">
        <a className="brand-link" href="/">
          RSP
        </a>
        <nav>
          <a href="/crew">My Events</a>
          <a className="active" href="#overview">
            Event Brief
          </a>
          <a href="#schedule">Schedule</a>
          <a href="#documents">Documents</a>
          <a href="#contacts">Contacts</a>
          <a href="/admin">Admin</a>
        </nav>
        <div className="crew-profile">
          {clerkEnabled ? <UserButton afterSignOutUrl="/" /> : <span className="demo-avatar">RS</span>}
          <div>
            <strong>{dashboard.crewName}</strong>
            <span>{dashboard.role}</span>
          </div>
        </div>
      </aside>

      <section className="crew-workspace">
        <header className="crew-header" id="overview">
          <div>
            <p className="eyebrow">Event Brief</p>
            <h1>{dashboard.gig.title}</h1>
            <p>
              {dashboard.gig.crewCall} crew call · {dashboard.gig.venueName} · {dashboard.gig.venueAddress}
            </p>
          </div>
          <div className="crew-actions">
            <PrintBriefButton />
            <a className="button button-secondary" href={`mailto:?subject=${encodeURIComponent(dashboard.gig.title)}`}>
              Email Brief
            </a>
            <a className="button button-primary" href={`/api/calendar/${dashboard.gig.id}`}>
              Add to Calendar
            </a>
          </div>
        </header>

        <div className="notice">
          <strong>Production note</strong>
          <span>{dashboard.gig.note}</span>
        </div>

        <section className="stat-grid" aria-label="Event times">
          <div>
            <span>Call</span>
            <strong>{dashboard.gig.crewCall}</strong>
          </div>
          <div>
            <span>Doors</span>
            <strong>{dashboard.gig.doors}</strong>
          </div>
          <div>
            <span>Show</span>
            <strong>{dashboard.gig.showStart}</strong>
          </div>
          <div>
            <span>Strike</span>
            <strong>{dashboard.gig.strike}</strong>
          </div>
        </section>

        <div className="content-grid">
          <article className="panel">
            <p className="eyebrow">Your Role</p>
            <h2>{dashboard.assignment.role}</h2>
            <p>{dashboard.assignment.details}</p>
          </article>
          <article className="panel">
            <p className="eyebrow">Service</p>
            <h2>{dashboard.gig.serviceType}</h2>
            <p>Everything the team needs is collected here instead of scattered across a Drive invite.</p>
          </article>
        </div>

        <section className="panel" id="schedule">
          <div className="section-heading">
            <p className="eyebrow">Run of Show</p>
            <h2>Timeline</h2>
          </div>
          <ol className="timeline">
            {dashboard.timeline.length ? (
              dashboard.timeline.map((item) => (
                <li key={`${item.time}-${item.label}`}>
                  <time>{item.time}</time>
                  <span>{item.label}</span>
                </li>
              ))
            ) : (
              <li>
                <time>TBD</time>
                <span>Timeline has not been added yet.</span>
              </li>
            )}
          </ol>
        </section>

        <div className="content-grid">
          <section className="panel" id="documents">
            <div className="section-heading">
              <p className="eyebrow">Files</p>
              <h2>Gig Documents</h2>
            </div>
            <div className="link-list">
              {dashboard.documents.length ? (
                dashboard.documents.map((document) => (
                  <a href={document.url} key={document.label}>
                    {document.label} · {document.kind}
                  </a>
                ))
              ) : (
                <span>No documents have been added yet.</span>
              )}
            </div>
          </section>

          <section className="panel" id="contacts">
            <div className="section-heading">
              <p className="eyebrow">Contacts</p>
              <h2>Key People</h2>
            </div>
            <div className="contact-list">
              {dashboard.contacts.length ? (
                dashboard.contacts.map((contact) => (
                  <div key={`${contact.role}-${contact.name}`}>
                    <strong>{contact.name}</strong>
                    <span>{contact.role}</span>
                    {contact.phone ? <a href={`tel:${contact.phone}`}>{contact.phone}</a> : null}
                    {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
                  </div>
                ))
              ) : (
                <span>No contacts have been added yet.</span>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

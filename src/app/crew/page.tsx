import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCrewEventsDashboard } from "@/lib/crew-data";

export const dynamic = "force-dynamic";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default async function CrewPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const { userId } = clerkEnabled ? await auth() : { userId: "local-demo-user" };

  if (clerkEnabled && !userId) {
    redirect("/sign-in");
  }

  const dashboard = await getCrewEventsDashboard(userId ?? "local-demo-user");

  return (
    <main className="crew-app">
      <aside className="crew-rail">
        <a className="brand-link" href="/">
          RSP
        </a>
        <nav>
          <a className="active" href="/crew">
            My Events
          </a>
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
            <p className="eyebrow">Crew Dashboard</p>
            <h1>My Events</h1>
            <p>Every active event you are assigned to, with the full brief one click away.</p>
          </div>
        </header>

        <section className="crew-event-dashboard" aria-label="Assigned events">
          {dashboard.events.length ? (
            dashboard.events.map((event) => (
              <a className="crew-event-card" href={`/crew/${event.id}`} key={event.id}>
                <div className="event-date">
                  <span>{formatEventDate(event.startsAt).split(" ")[0]}</span>
                  <strong>{formatEventDate(event.startsAt).split(" ")[1]?.replace(",", "")}</strong>
                </div>
                <div>
                  <p className="eyebrow">{event.serviceType}</p>
                  <h2>{event.title}</h2>
                  <p>
                    {event.venueName} · {formatEventTime(event.startsAt)}-{formatEventTime(event.endsAt)}
                  </p>
                  <div className="crew-event-card__meta">
                    <span>{event.role}</span>
                    <span>Crew call: {event.crewCall}</span>
                  </div>
                </div>
              </a>
            ))
          ) : (
            <section className="panel empty-crew-dashboard">
              <p className="eyebrow">No Active Events</p>
              <h2>You are not assigned to any upcoming events yet.</h2>
              <p>Once an admin assigns you to an active event, it will show up here.</p>
            </section>
          )}
        </section>
      </section>
    </main>
  );
}

import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminDashboardData, type AdminGig } from "@/lib/admin/data";
import {
  createAssignment,
  createCrewProfile,
  createGig,
  createGigContact,
  createGigDocument,
  createTimelineItem
} from "./actions";
import { ClerkUserFields } from "./ClerkUserFields";

export const dynamic = "force-dynamic";

function dateTimeDefault(hoursFromNow: number) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function sortEvents(gigs: AdminGig[]) {
  const now = Date.now();

  return {
    scheduled: gigs.filter((gig) => new Date(gig.ends_at).getTime() >= now),
    past: gigs.filter((gig) => new Date(gig.ends_at).getTime() < now).reverse()
  };
}

export default async function AdminPage() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const { userId } = clerkEnabled ? await auth() : { userId: "local-demo-user" };

  if (clerkEnabled && !userId) {
    redirect("/sign-in");
  }

  const adminData = await getAdminDashboardData(userId ?? "local-demo-user");

  if (!adminData) {
    return (
      <main className="auth-shell">
        <a className="brand-link" href="/">
          RSP
        </a>
        <section className="setup-panel">
          <p className="eyebrow">Admin Access</p>
          <h1>Not authorized</h1>
          <p>Your account is signed in, but it is not marked as an admin crew profile.</p>
          <a className="button button-secondary" href="/crew">
            Go to Crew Portal
          </a>
        </section>
      </main>
    );
  }

  const { scheduled, past } = sortEvents(adminData.gigs);
  const hasCrew = adminData.crew.length > 0;
  const hasAvailableClerkUsers = adminData.availableClerkUsers.length > 0;

  return (
    <main className="crew-app admin-app">
      <aside className="crew-rail">
        <a className="brand-link" href="/">
          RSP
        </a>
        <nav>
          <a className="active" href="#events">
            Events
          </a>
          <a href="#create-event">Create Event</a>
          <a href="#crew">Crew</a>
          <a href="/crew">Crew View</a>
        </nav>
        <div className="crew-profile">
          {clerkEnabled ? <UserButton afterSignOutUrl="/" /> : <span className="demo-avatar">RS</span>}
          <div>
            <strong>{adminData.adminProfile.full_name}</strong>
            <span>Admin</span>
          </div>
        </div>
      </aside>

      <section className="crew-workspace admin-workspace">
        <header className="crew-header admin-hero" id="events">
          <div>
            <p className="eyebrow">Production Office</p>
            <h1>Events</h1>
            <p>Build the event once here, then your crew sees the clean version in their portal.</p>
          </div>
          <div className="crew-actions">
            <a className="button button-primary" href="#create-event">
              Create an event
            </a>
            <a className="button button-secondary" href="/crew">
              Preview Crew Portal
            </a>
          </div>
        </header>

        <section className="event-list-section">
          <div className="section-heading">
            <p className="eyebrow">Scheduled Events</p>
            <h2>{scheduled.length ? `${scheduled.length} upcoming` : "No upcoming events yet"}</h2>
          </div>
          <div className="event-list">
            {scheduled.length ? (
              scheduled.map((gig) => (
                <EventCard adminData={adminData} gig={gig} hasCrew={hasCrew} key={gig.id} />
              ))
            ) : (
              <EmptyState
                title="Create the first event"
                text="Once you add the show details, this area becomes the simple schedule list."
              />
            )}
          </div>
        </section>

        <section className="panel admin-panel create-event-panel" id="create-event">
          <div className="section-heading">
            <p className="eyebrow">New Event</p>
            <h2>Create an event</h2>
          </div>
          <form action={createGig} className="admin-form event-create-form">
            <label className="admin-form__wide">
              Event Name
              <input name="title" placeholder="Dunlap Summer Kickoff" required />
            </label>
            <label>
              Service Type
              <input name="service_type" defaultValue="Live Production" required />
            </label>
            <label>
              Venue
              <input name="venue_name" placeholder="North Park Bandshell" required />
            </label>
            <label className="admin-form__wide">
              Venue Address
              <input name="venue_address" placeholder="123 Main St, Dunlap, IL" required />
            </label>
            <label>
              Start
              <input name="starts_at" type="datetime-local" defaultValue={dateTimeDefault(48)} required />
            </label>
            <label>
              End
              <input name="ends_at" type="datetime-local" defaultValue={dateTimeDefault(54)} required />
            </label>
            <label>
              Crew Call
              <input name="crew_call_label" placeholder="2:00 PM" required />
            </label>
            <label>
              Doors
              <input name="doors_label" placeholder="5:30 PM" required />
            </label>
            <label>
              Show
              <input name="show_start_label" placeholder="6:00 PM" required />
            </label>
            <label>
              Strike
              <input name="strike_label" placeholder="9:45 PM" required />
            </label>
            <label className="admin-form__wide">
              Team Notes
              <textarea
                name="production_note"
                placeholder="Parking, load-in, weather plan, client expectations..."
                rows={4}
                required
              />
            </label>
            <button className="button button-primary admin-form__button" type="submit">
              Save event
            </button>
          </form>
        </section>

        <section className="event-list-section">
          <div className="section-heading">
            <p className="eyebrow">Past Events</p>
            <h2>{past.length ? `${past.length} archived` : "Nothing has passed yet"}</h2>
          </div>
          <div className="event-list event-list--past">
            {past.length ? (
              past.map((gig) => <EventCard adminData={adminData} gig={gig} hasCrew={hasCrew} key={gig.id} />)
            ) : (
              <EmptyState title="Past events will land here" text="Completed shows move here automatically by end date." />
            )}
          </div>
        </section>

        <section className="panel admin-panel" id="crew">
          <div className="section-heading">
            <p className="eyebrow">Crew Accounts</p>
            <h2>Add a crew member</h2>
          </div>
          <form action={createCrewProfile} className="admin-form crew-create-form">
            <ClerkUserFields users={adminData.availableClerkUsers} />
            <label>
              Default Role
              <input name="default_role" placeholder="Audio Tech" required />
            </label>
            <label>
              Phone
              <input name="phone" placeholder="309-..." />
            </label>
            <button className="button button-primary" type="submit" disabled={!hasAvailableClerkUsers}>
              Add Crew Member
            </button>
          </form>
          <p className="admin-help">
            Crew members sign up first. After they have a Clerk account, they appear here and can be assigned to events.
          </p>
        </section>
      </section>
    </main>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-event-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function EventCard({
  adminData,
  gig,
  hasCrew
}: {
  adminData: Awaited<ReturnType<typeof getAdminDashboardData>>;
  gig: AdminGig;
  hasCrew: boolean;
}) {
  if (!adminData) {
    return null;
  }

  const assignments = adminData.assignments.filter((assignment) => assignment.gig_id === gig.id);
  const timelineItems = adminData.timelineItems.filter((item) => item.gig_id === gig.id);
  const documents = adminData.documents.filter((document) => document.gig_id === gig.id);
  const contacts = adminData.contacts.filter((contact) => contact.gig_id === gig.id);

  return (
    <article className="event-card">
      <div className="event-card__summary">
        <div className="event-date">
          <span>{formatDate(gig.starts_at).split(" ")[0]}</span>
          <strong>{formatDate(gig.starts_at).split(" ")[1]?.replace(",", "")}</strong>
        </div>
        <div>
          <p className="eyebrow">{gig.service_type}</p>
          <h3>{gig.title}</h3>
          <p>
            {gig.venue_name} · {formatTime(gig.starts_at)}-{formatTime(gig.ends_at)}
          </p>
        </div>
      </div>
      <div className="event-card__meta">
        <span>{assignments.length} assigned</span>
        <span>{timelineItems.length} timeline items</span>
        <span>{documents.length} docs</span>
      </div>
      <details className="event-builder">
        <summary>Fill out team details</summary>
        <div className="event-builder__grid">
          <form action={createAssignment} className="admin-form compact-admin-form">
            <input name="gig_id" type="hidden" value={gig.id} />
            <h4>Assign Crew</h4>
            <label>
              Crew Member
              <select name="crew_profile_id" required disabled={!hasCrew}>
                {adminData.crew.map((profile) => (
                  <option value={profile.id} key={profile.id}>
                    {profile.full_name} · {profile.default_role}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Role
              <input name="role" placeholder="Stage Audio" required />
            </label>
            <label>
              Details
              <textarea name="details" placeholder="What they need to own for this event..." rows={3} required />
            </label>
            <button className="button button-primary" type="submit" disabled={!hasCrew}>
              Save
            </button>
          </form>

          <form action={createTimelineItem} className="admin-form compact-admin-form">
            <input name="gig_id" type="hidden" value={gig.id} />
            <h4>Timeline</h4>
            <label>
              Order
              <input name="sort_order" type="number" defaultValue={timelineItems.length + 1} required />
            </label>
            <label>
              Time
              <input name="time_label" placeholder="4:20 PM" required />
            </label>
            <label>
              Item
              <input name="label" placeholder="Line check, RF scan, lighting focus" required />
            </label>
            <button className="button button-primary" type="submit">
              Add
            </button>
          </form>

          <form action={createGigDocument} className="admin-form compact-admin-form">
            <input name="gig_id" type="hidden" value={gig.id} />
            <h4>Document Link</h4>
            <label>
              Label
              <input name="label" placeholder="Stage plot" required />
            </label>
            <label>
              Type
              <input name="kind" placeholder="PDF" required />
            </label>
            <label>
              URL
              <input name="url" type="url" placeholder="https://..." required />
            </label>
            <button className="button button-primary" type="submit">
              Add
            </button>
          </form>

          <form action={createGigContact} className="admin-form compact-admin-form">
            <input name="gig_id" type="hidden" value={gig.id} />
            <h4>Contact</h4>
            <label>
              Name
              <input name="name" placeholder="Venue Manager" required />
            </label>
            <label>
              Role
              <input name="role" placeholder="Venue" required />
            </label>
            <label>
              Email
              <input name="email" type="email" placeholder="name@example.com" />
            </label>
            <label>
              Phone
              <input name="phone" placeholder="309-..." />
            </label>
            <button className="button button-primary" type="submit">
              Add
            </button>
          </form>
        </div>
        <div className="event-builder__preview">
          <MiniList title="Assigned Crew" items={assignments.map((assignment) => `${assignment.crew_profiles?.full_name ?? "Crew"} · ${assignment.role}`)} />
          <MiniList title="Timeline" items={timelineItems.map((item) => `${item.time_label} · ${item.label}`)} />
          <MiniList title="Documents" items={documents.map((document) => `${document.label} · ${document.kind}`)} />
          <MiniList title="Contacts" items={contacts.map((contact) => `${contact.name} · ${contact.role}`)} />
        </div>
      </details>
    </article>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4>{title}</h4>
      {items.length ? (
        items.map((item) => <p key={item}>{item}</p>)
      ) : (
        <p className="muted-mini-list">Nothing added yet</p>
      )}
    </div>
  );
}

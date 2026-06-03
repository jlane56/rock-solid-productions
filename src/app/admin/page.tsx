import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAdminDashboardData } from "@/lib/admin/data";
import {
  createAssignment,
  createCrewProfile,
  createGig,
  createGigContact,
  createGigDocument,
  createTimelineItem
} from "./actions";

export const dynamic = "force-dynamic";

function dateTimeDefault(hoursFromNow: number) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
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

  const firstGig = adminData.gigs[0];
  const hasGigs = adminData.gigs.length > 0;
  const hasCrew = adminData.crew.length > 0;

  return (
    <main className="crew-app admin-app">
      <aside className="crew-rail">
        <a className="brand-link" href="/">
          RSP
        </a>
        <nav>
          <a className="active" href="#overview">
            Overview
          </a>
          <a href="#gigs">Gigs</a>
          <a href="#crew">Crew</a>
          <a href="#assignments">Assignments</a>
          <a href="#assets">Docs</a>
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

      <section className="crew-workspace">
        <header className="crew-header" id="overview">
          <div>
            <p className="eyebrow">Production Office</p>
            <h1>Admin Portal</h1>
            <p>Create gigs, build call sheets, assign crew, and keep every production detail in one place.</p>
          </div>
          <div className="crew-actions">
            <a className="button button-secondary" href="/crew">
              Preview Crew Portal
            </a>
          </div>
        </header>

        <section className="stat-grid admin-stat-grid" aria-label="Portal totals">
          <div>
            <span>Gigs</span>
            <strong>{adminData.gigs.length}</strong>
          </div>
          <div>
            <span>Crew</span>
            <strong>{adminData.crew.length}</strong>
          </div>
          <div>
            <span>Assignments</span>
            <strong>{adminData.assignments.length}</strong>
          </div>
          <div>
            <span>Docs</span>
            <strong>{adminData.documents.length}</strong>
          </div>
        </section>

        <div className="content-grid admin-form-grid">
          <section className="panel admin-panel" id="gigs">
            <div className="section-heading">
              <p className="eyebrow">Gigs</p>
              <h2>Create Gig</h2>
            </div>
            <form action={createGig} className="admin-form">
              <label>
                Title
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
              <label>
                Venue Address
                <input name="venue_address" placeholder="Dunlap, IL" required />
              </label>
              <div className="admin-form__split">
                <label>
                  Start
                  <input name="starts_at" type="datetime-local" defaultValue={dateTimeDefault(48)} required />
                </label>
                <label>
                  End
                  <input name="ends_at" type="datetime-local" defaultValue={dateTimeDefault(54)} required />
                </label>
              </div>
              <div className="admin-form__split">
                <label>
                  Crew Call
                  <input name="crew_call_label" placeholder="2:00 PM" required />
                </label>
                <label>
                  Doors
                  <input name="doors_label" placeholder="5:30 PM" required />
                </label>
              </div>
              <div className="admin-form__split">
                <label>
                  Show
                  <input name="show_start_label" placeholder="6:00 PM" required />
                </label>
                <label>
                  Strike
                  <input name="strike_label" placeholder="9:45 PM" required />
                </label>
              </div>
              <label>
                Production Note
                <textarea
                  name="production_note"
                  placeholder="Rain plan, parking notes, load-in instructions..."
                  rows={4}
                  required
                />
              </label>
              <button className="button button-primary" type="submit">
                Create Gig
              </button>
            </form>
          </section>

          <section className="panel admin-panel" id="crew">
            <div className="section-heading">
              <p className="eyebrow">Crew</p>
              <h2>Add Crew</h2>
            </div>
            <form action={createCrewProfile} className="admin-form">
              <label>
                Clerk User ID
                <input name="clerk_user_id" placeholder="user_..." required />
              </label>
              <label>
                Name
                <input name="full_name" placeholder="Crew member name" required />
              </label>
              <label>
                Default Role
                <input name="default_role" placeholder="Audio Tech" required />
              </label>
              <label>
                Phone
                <input name="phone" placeholder="309-..." />
              </label>
              <button className="button button-primary" type="submit">
                Add Crew Member
              </button>
            </form>
            <p className="admin-help">
              Crew members need a Clerk account first. You can copy their `user_...` ID from Clerk after they sign up.
            </p>
          </section>
        </div>

        <div className="content-grid admin-form-grid">
          <section className="panel admin-panel" id="assignments">
            <div className="section-heading">
              <p className="eyebrow">Assignments</p>
              <h2>Assign Crew</h2>
            </div>
            <form action={createAssignment} className="admin-form">
              <label>
                Gig
                <select name="gig_id" required disabled={!hasGigs}>
                  {adminData.gigs.map((gig) => (
                    <option value={gig.id} key={gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </label>
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
                <textarea name="details" placeholder="What they need to own for this gig..." rows={4} required />
              </label>
              <button className="button button-primary" type="submit" disabled={!hasGigs || !hasCrew}>
                Save Assignment
              </button>
            </form>
          </section>

          <section className="panel admin-panel">
            <div className="section-heading">
              <p className="eyebrow">Timeline</p>
              <h2>Add Run Item</h2>
            </div>
            <form action={createTimelineItem} className="admin-form">
              <label>
                Gig
                <select name="gig_id" required disabled={!hasGigs}>
                  {adminData.gigs.map((gig) => (
                    <option value={gig.id} key={gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-form__split">
                <label>
                  Order
                  <input name="sort_order" type="number" defaultValue={adminData.timelineItems.length + 1} required />
                </label>
                <label>
                  Time
                  <input name="time_label" placeholder="4:20 PM" required />
                </label>
              </div>
              <label>
                Label
                <input name="label" placeholder="Line check, RF scan, lighting focus" required />
              </label>
              <button className="button button-primary" type="submit" disabled={!hasGigs}>
                Add Timeline Item
              </button>
            </form>
          </section>
        </div>

        <div className="content-grid admin-form-grid" id="assets">
          <section className="panel admin-panel">
            <div className="section-heading">
              <p className="eyebrow">Documents</p>
              <h2>Add Link</h2>
            </div>
            <form action={createGigDocument} className="admin-form">
              <label>
                Gig
                <select name="gig_id" required disabled={!hasGigs}>
                  {adminData.gigs.map((gig) => (
                    <option value={gig.id} key={gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </label>
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
              <button className="button button-primary" type="submit" disabled={!hasGigs}>
                Add Document
              </button>
            </form>
          </section>

          <section className="panel admin-panel">
            <div className="section-heading">
              <p className="eyebrow">Contacts</p>
              <h2>Add Contact</h2>
            </div>
            <form action={createGigContact} className="admin-form">
              <label>
                Gig
                <select name="gig_id" required disabled={!hasGigs}>
                  {adminData.gigs.map((gig) => (
                    <option value={gig.id} key={gig.id}>
                      {gig.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Name
                <input name="name" placeholder="Venue Manager" required />
              </label>
              <label>
                Role
                <input name="role" placeholder="Venue" required />
              </label>
              <div className="admin-form__split">
                <label>
                  Email
                  <input name="email" type="email" placeholder="name@example.com" />
                </label>
                <label>
                  Phone
                  <input name="phone" placeholder="309-..." />
                </label>
              </div>
              <button className="button button-primary" type="submit" disabled={!hasGigs}>
                Add Contact
              </button>
            </form>
          </section>
        </div>

        <section className="panel admin-panel admin-table-panel">
          <div className="section-heading">
            <p className="eyebrow">Current Build</p>
            <h2>{firstGig ? firstGig.title : "No gigs yet"}</h2>
          </div>
          <div className="admin-lists">
            <div>
              <h3>Gigs</h3>
              {adminData.gigs.map((gig) => (
                <p key={gig.id}>
                  <strong>{gig.title}</strong>
                  <span>{gig.venue_name}</span>
                </p>
              ))}
            </div>
            <div>
              <h3>Crew</h3>
              {adminData.crew.map((profile) => (
                <p key={profile.id}>
                  <strong>{profile.full_name}</strong>
                  <span>{profile.default_role}</span>
                </p>
              ))}
            </div>
            <div>
              <h3>Assignments</h3>
              {adminData.assignments.map((assignment) => (
                <p key={assignment.id}>
                  <strong>{assignment.crew_profiles?.full_name ?? "Crew"}</strong>
                  <span>
                    {assignment.role} · {assignment.production_gigs?.title ?? "Gig"}
                  </span>
                </p>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

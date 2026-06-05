import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CrewDocument = {
  label: string;
  kind: string;
  url: string;
};

export type CrewContact = {
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
};

export type CrewEventSummary = {
  id: string;
  title: string;
  serviceType: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  endsAt: string;
  crewCall: string;
  role: string;
  details: string;
};

export type CrewEventsDashboard = {
  crewName: string;
  role: string;
  events: CrewEventSummary[];
};

export type CrewDashboard = {
  crewName: string;
  role: string;
  gig: {
    id: string;
    title: string;
    serviceType: string;
    venueName: string;
    venueAddress: string;
    startsAt: string;
    endsAt: string;
    crewCall: string;
    doors: string;
    showStart: string;
    strike: string;
    note: string;
  };
  assignment: {
    role: string;
    details: string;
  };
  timeline: Array<{
    time: string;
    label: string;
  }>;
  documents: CrewDocument[];
  contacts: CrewContact[];
};

type GigRow = {
  id: string;
  title: string;
  service_type: string;
  venue_name: string;
  venue_address: string;
  starts_at: string;
  ends_at: string;
  crew_call_label: string;
  doors_label: string;
  show_start_label: string;
  strike_label: string;
  production_note: string;
};

type AssignmentRow = {
  role: string;
  details: string;
  production_gigs: GigRow | GigRow[] | null;
};

const sampleDashboard: CrewDashboard = {
  crewName: "Crew Member",
  role: "Audio Tech",
  gig: {
    id: "demo-dunlap-summer-kickoff",
    title: "Dunlap Summer Kickoff",
    serviceType: "Concert",
    venueName: "North Park Bandshell",
    venueAddress: "Dunlap, IL",
    startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 54 * 60 * 60 * 1000).toISOString(),
    crewCall: "2:00 PM",
    doors: "5:30 PM",
    showStart: "6:00 PM",
    strike: "9:45 PM",
    note: "Rain plan is active. Bring cable ramps, extra towels, pop-up sidewalls, and outdoor-rated distros."
  },
  assignment: {
    role: "Audio Engineer",
    details: "Patch stage inputs, label subsnakes, assist monitor world, and verify RF scan before doors."
  },
  timeline: [
    { time: "2:00 PM", label: "Crew call, unload, stage plot review" },
    { time: "3:15 PM", label: "PA fly, power distro, cable paths" },
    { time: "4:20 PM", label: "Line check, RF scan, lighting focus" },
    { time: "5:30 PM", label: "Doors and house music" },
    { time: "6:00 PM", label: "Opening band" },
    { time: "7:30 PM", label: "Headliner" },
    { time: "9:45 PM", label: "Strike and truck pack" }
  ],
  documents: [
    { label: "Stage plot", kind: "PDF", url: "#" },
    { label: "Input list", kind: "Sheet", url: "#" },
    { label: "Venue map", kind: "PDF", url: "#" },
    { label: "Truck pack", kind: "Checklist", url: "#" }
  ],
  contacts: [
    { name: "Production Lead", role: "Lead", email: "info@bookrsproductions.com", phone: "309-323-0011" },
    { name: "Venue Manager", role: "Venue", email: null, phone: null },
    { name: "Artist Advance", role: "Advance", email: null, phone: null }
  ]
};

const sampleEventsDashboard: CrewEventsDashboard = {
  crewName: sampleDashboard.crewName,
  role: sampleDashboard.role,
  events: [
    {
      id: sampleDashboard.gig.id,
      title: sampleDashboard.gig.title,
      serviceType: sampleDashboard.gig.serviceType,
      venueName: sampleDashboard.gig.venueName,
      venueAddress: sampleDashboard.gig.venueAddress,
      startsAt: sampleDashboard.gig.startsAt,
      endsAt: sampleDashboard.gig.endsAt,
      crewCall: sampleDashboard.gig.crewCall,
      role: sampleDashboard.assignment.role,
      details: sampleDashboard.assignment.details
    }
  ]
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function eventSummaryFromAssignment(assignment: AssignmentRow): CrewEventSummary | null {
  const gig = firstRelated(assignment.production_gigs);

  if (!gig) {
    return null;
  }

  return {
    id: gig.id,
    title: gig.title,
    serviceType: gig.service_type,
    venueName: gig.venue_name,
    venueAddress: gig.venue_address,
    startsAt: gig.starts_at,
    endsAt: gig.ends_at,
    crewCall: gig.crew_call_label,
    role: assignment.role,
    details: assignment.details
  };
}

async function getCrewProfile(clerkUserId: string) {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data: profile } = await supabase
    .from("crew_profiles")
    .select("id, full_name, default_role")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  return profile;
}

export async function getCrewEventsDashboard(clerkUserId: string): Promise<CrewEventsDashboard> {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return sampleEventsDashboard;
  }

  const profile = await getCrewProfile(clerkUserId);

  if (!profile) {
    return sampleEventsDashboard;
  }

  const { data: assignments } = await supabase
    .from("crew_assignments")
    .select("role, details, production_gigs(*)")
    .eq("crew_profile_id", profile.id)
    .order("created_at", { ascending: false });

  const now = Date.now();
  const events =
    (assignments as AssignmentRow[] | null)
      ?.map(eventSummaryFromAssignment)
      .filter((event): event is CrewEventSummary => Boolean(event))
      .filter((event) => new Date(event.endsAt).getTime() >= now)
      .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()) ?? [];

  return {
    crewName: profile.full_name ?? sampleDashboard.crewName,
    role: profile.default_role ?? sampleDashboard.role,
    events
  };
}

export async function getCrewEventDashboard(clerkUserId: string, gigId: string): Promise<CrewDashboard | null> {
  if (gigId === sampleDashboard.gig.id) {
    return sampleDashboard;
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return sampleDashboard;
  }

  const profile = await getCrewProfile(clerkUserId);

  if (!profile) {
    return null;
  }

  const { data: assignment } = await supabase
    .from("crew_assignments")
    .select("role, details, production_gigs(*)")
    .eq("crew_profile_id", profile.id)
    .eq("gig_id", gigId)
    .maybeSingle();

  const gig = firstRelated((assignment as AssignmentRow | null)?.production_gigs ?? null);

  if (!assignment || !gig) {
    return null;
  }

  const [{ data: timeline }, { data: documents }, { data: contacts }] = await Promise.all([
    supabase.from("gig_timeline_items").select("time_label, label").eq("gig_id", gig.id).order("sort_order"),
    supabase.from("gig_documents").select("label, kind, url").eq("gig_id", gig.id).order("created_at"),
    supabase.from("gig_contacts").select("name, role, email, phone").eq("gig_id", gig.id).order("created_at")
  ]);

  return {
    crewName: profile.full_name ?? sampleDashboard.crewName,
    role: profile.default_role ?? sampleDashboard.role,
    gig: {
      id: gig.id,
      title: gig.title,
      serviceType: gig.service_type,
      venueName: gig.venue_name,
      venueAddress: gig.venue_address,
      startsAt: gig.starts_at,
      endsAt: gig.ends_at,
      crewCall: gig.crew_call_label,
      doors: gig.doors_label,
      showStart: gig.show_start_label,
      strike: gig.strike_label,
      note: gig.production_note
    },
    assignment: {
      role: assignment.role,
      details: assignment.details
    },
    timeline: timeline?.map((item) => ({ time: item.time_label, label: item.label })) ?? [],
    documents: documents ?? [],
    contacts: contacts ?? []
  };
}

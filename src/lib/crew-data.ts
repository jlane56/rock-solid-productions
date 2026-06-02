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

export type CrewDashboard = {
  crewName: string;
  role: string;
  gig: {
    id: string;
    title: string;
    serviceType: string;
    venueName: string;
    venueAddress: string;
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

const sampleDashboard: CrewDashboard = {
  crewName: "Crew Member",
  role: "Audio Tech",
  gig: {
    id: "demo-dunlap-summer-kickoff",
    title: "Dunlap Summer Kickoff",
    serviceType: "Live Production",
    venueName: "North Park Bandshell",
    venueAddress: "Dunlap, IL",
    crewCall: "2:00 PM",
    doors: "5:30 PM",
    showStart: "6:00 PM",
    strike: "9:45 PM",
    note: "Rain plan is active. Bring cable ramps, extra towels, pop-up sidewalls, and outdoor-rated distros."
  },
  assignment: {
    role: "Stage Audio",
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

export async function getCrewDashboard(clerkUserId: string): Promise<CrewDashboard> {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return sampleDashboard;
  }

  const { data: profile } = await supabase
    .from("crew_profiles")
    .select("id, full_name, default_role")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (!profile) {
    return sampleDashboard;
  }

  const { data: assignment } = await supabase
    .from("crew_assignments")
    .select("role, details, production_gigs(*)")
    .eq("crew_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const gig = Array.isArray(assignment?.production_gigs)
    ? assignment?.production_gigs[0]
    : assignment?.production_gigs;

  if (!assignment || !gig) {
    return {
      ...sampleDashboard,
      crewName: profile.full_name ?? sampleDashboard.crewName,
      role: profile.default_role ?? sampleDashboard.role
    };
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
    timeline: timeline?.map((item) => ({ time: item.time_label, label: item.label })) ?? sampleDashboard.timeline,
    documents: documents ?? sampleDashboard.documents,
    contacts: contacts ?? sampleDashboard.contacts
  };
}

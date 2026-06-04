import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AdminCrewProfile = {
  id: string;
  clerk_user_id: string;
  full_name: string;
  default_role: string;
  phone: string | null;
  created_at: string;
};

export type AdminGig = {
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
  created_at: string;
};

export type AdminAssignment = {
  id: string;
  gig_id: string;
  role: string;
  details: string;
  crew_profiles: {
    full_name: string;
    default_role: string;
  } | null;
  production_gigs: {
    title: string;
  } | null;
};

type AssignmentRow = {
  id: string;
  gig_id: string;
  role: string;
  details: string;
  crew_profiles:
    | {
        full_name: string;
        default_role: string;
      }
    | {
        full_name: string;
        default_role: string;
      }[]
    | null;
  production_gigs:
    | {
        title: string;
      }
    | {
        title: string;
      }[]
    | null;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeAssignments(assignments: AssignmentRow[] | null): AdminAssignment[] {
  return (assignments ?? []).map((assignment) => ({
    id: assignment.id,
    gig_id: assignment.gig_id,
    role: assignment.role,
    details: assignment.details,
    crew_profiles: firstRelated(assignment.crew_profiles),
    production_gigs: firstRelated(assignment.production_gigs)
  }));
}

export type AdminTimelineItem = {
  id: string;
  gig_id: string;
  sort_order: number;
  time_label: string;
  label: string;
};

export type AdminDocument = {
  id: string;
  gig_id: string;
  label: string;
  kind: string;
  url: string;
};

export type AdminContact = {
  id: string;
  gig_id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
};

export type AdminClerkUser = {
  id: string;
  label: string;
  email: string;
  name: string;
};

export type AdminDashboardData = {
  adminProfile: AdminCrewProfile;
  availableClerkUsers: AdminClerkUser[];
  crew: AdminCrewProfile[];
  gigs: AdminGig[];
  assignments: AdminAssignment[];
  timelineItems: AdminTimelineItem[];
  documents: AdminDocument[];
  contacts: AdminContact[];
};

function displayNameFromClerkUser(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) {
    return "Portal Admin";
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.emailAddresses[0]?.emailAddress || "Portal Admin";
}

async function getAvailableClerkUsers(existingProfiles: AdminCrewProfile[]): Promise<AdminClerkUser[]> {
  if (!process.env.CLERK_SECRET_KEY) {
    return [];
  }

  const existingUserIds = new Set(existingProfiles.map((profile) => profile.clerk_user_id));
  const client = await clerkClient();
  const response = await client.users.getUserList({ limit: 100 });

  return response.data
    .filter((user) => !existingUserIds.has(user.id))
    .map((user) => {
      const email = user.emailAddresses[0]?.emailAddress ?? "";
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
      const fallbackName = name || email || user.id;

      return {
        id: user.id,
        email,
        name: fallbackName,
        label: `${fallbackName}${email && email !== fallbackName ? ` · ${email}` : ""}`
      };
    });
}

export async function getAdminDashboardData(clerkUserId: string): Promise<AdminDashboardData | null> {
  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return null;
  }

  const user = await currentUser();

  const { count: adminCount, error: countError } = await supabase
    .from("crew_profiles")
    .select("id", { count: "exact", head: true })
    .ilike("default_role", "admin");

  if (countError) {
    throw new Error(countError.message);
  }

  let { data: adminProfile, error: profileError } = await supabase
    .from("crew_profiles")
    .select("id, clerk_user_id, full_name, default_role, phone, created_at")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!adminProfile && adminCount === 0) {
    const { data: createdProfile, error: createError } = await supabase
      .from("crew_profiles")
      .insert({
        clerk_user_id: clerkUserId,
        full_name: displayNameFromClerkUser(user),
        default_role: "Admin",
        phone: null
      })
      .select("id, clerk_user_id, full_name, default_role, phone, created_at")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    adminProfile = createdProfile;
  }

  if (adminProfile && adminProfile.default_role.toLowerCase() !== "admin" && adminCount === 0) {
    const { data: promotedProfile, error: promoteError } = await supabase
      .from("crew_profiles")
      .update({ default_role: "Admin" })
      .eq("id", adminProfile.id)
      .select("id, clerk_user_id, full_name, default_role, phone, created_at")
      .single();

    if (promoteError) {
      throw new Error(promoteError.message);
    }

    adminProfile = promotedProfile;
  }

  if (!adminProfile || adminProfile.default_role.toLowerCase() !== "admin") {
    return null;
  }

  const [{ data: crew, error: crewError }, { data: gigs, error: gigsError }] = await Promise.all([
    supabase
      .from("crew_profiles")
      .select("id, clerk_user_id, full_name, default_role, phone, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("production_gigs")
      .select(
        "id, title, service_type, venue_name, venue_address, starts_at, ends_at, crew_call_label, doors_label, show_start_label, strike_label, production_note, created_at"
      )
      .order("starts_at", { ascending: true })
  ]);

  if (crewError) {
    throw new Error(crewError.message);
  }

  if (gigsError) {
    throw new Error(gigsError.message);
  }

  const [{ data: assignments }, { data: timelineItems }, { data: documents }, { data: contacts }] = await Promise.all([
    supabase
      .from("crew_assignments")
      .select("id, gig_id, role, details, crew_profiles(full_name, default_role), production_gigs(title)")
      .order("created_at", { ascending: false }),
    supabase.from("gig_timeline_items").select("id, gig_id, sort_order, time_label, label").order("sort_order"),
    supabase.from("gig_documents").select("id, gig_id, label, kind, url").order("created_at", { ascending: false }),
    supabase.from("gig_contacts").select("id, gig_id, name, role, email, phone").order("created_at", { ascending: false })
  ]);

  const availableClerkUsers = await getAvailableClerkUsers(crew ?? []);

  return {
    adminProfile,
    availableClerkUsers,
    crew: crew ?? [],
    gigs: gigs ?? [],
    assignments: normalizeAssignments(assignments as AssignmentRow[] | null),
    timelineItems: timelineItems ?? [],
    documents: documents ?? [],
    contacts: contacts ?? []
  };
}

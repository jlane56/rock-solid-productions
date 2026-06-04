"use server";

import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdminDashboardData } from "@/lib/admin/data";

async function requireAdmin() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("You must be signed in.");
  }

  const adminData = await getAdminDashboardData(userId);

  if (!adminData) {
    throw new Error("You do not have admin access.");
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableValue(formData: FormData, key: string) {
  const result = value(formData, key);
  return result || null;
}

function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/crew");
}

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function icsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcsText(valueToEscape: string) {
  return valueToEscape.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

async function notifyCrewAssignment({
  crewProfileId,
  details,
  gigId,
  role
}: {
  crewProfileId: string;
  details: string;
  gigId: string;
  role: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    return;
  }

  const supabase = createServerSupabaseClient();

  if (!supabase) {
    return;
  }

  const [{ data: gig }, { data: crewProfile }] = await Promise.all([
    supabase
      .from("production_gigs")
      .select("id, title, service_type, venue_name, venue_address, starts_at, ends_at, crew_call_label, doors_label, show_start_label, strike_label, production_note")
      .eq("id", gigId)
      .maybeSingle(),
    supabase.from("crew_profiles").select("full_name, clerk_user_id").eq("id", crewProfileId).maybeSingle()
  ]);

  if (!gig || !crewProfile) {
    return;
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(crewProfile.clerk_user_id);
  const recipient = clerkUser.emailAddresses[0]?.emailAddress;

  if (!recipient) {
    return;
  }

  const calendarUrl = `${appBaseUrl()}/api/calendar/${gig.id}`;
  const crewUrl = `${appBaseUrl()}/crew`;
  const subject = `You are assigned: ${gig.title}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rock Solid Productions//Crew Portal//EN",
    "BEGIN:VEVENT",
    `UID:${gig.id}-${crewProfileId}@rock-solid-productions`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(gig.starts_at)}`,
    `DTEND:${icsDate(gig.ends_at)}`,
    `SUMMARY:${escapeIcsText(`${gig.title} - ${role}`)}`,
    `LOCATION:${escapeIcsText(`${gig.venue_name}, ${gig.venue_address}`)}`,
    `DESCRIPTION:${escapeIcsText(`Role: ${role}\nCrew Call: ${gig.crew_call_label}\nDoors: ${gig.doors_label}\nShow: ${gig.show_start_label}\nStrike: ${gig.strike_label}\n\n${details || gig.production_note}\n\nCrew portal: ${crewUrl}`)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Rock Solid Productions <onboarding@resend.dev>",
      to: recipient,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #171717; line-height: 1.55;">
          <h1 style="margin: 0 0 12px;">${gig.title}</h1>
          <p>You have been assigned as <strong>${role}</strong>.</p>
          <p><strong>Venue:</strong> ${gig.venue_name}<br/>
          <strong>Address:</strong> ${gig.venue_address}<br/>
          <strong>Crew call:</strong> ${gig.crew_call_label}<br/>
          <strong>Show:</strong> ${gig.show_start_label}</p>
          ${details ? `<p><strong>Notes:</strong><br/>${details}</p>` : ""}
          <p><a href="${crewUrl}">Open the crew portal</a></p>
          <p><a href="${calendarUrl}">Add this event to your calendar</a></p>
        </div>
      `,
      attachments: [
        {
          filename: `${gig.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${role.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`,
          content: Buffer.from(ics).toString("base64")
        }
      ]
    })
  });
}

export async function createGig(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("production_gigs").insert({
    title: value(formData, "title"),
    service_type: value(formData, "service_type") || "Live Production",
    venue_name: value(formData, "venue_name"),
    venue_address: value(formData, "venue_address"),
    starts_at: value(formData, "starts_at"),
    ends_at: value(formData, "ends_at"),
    crew_call_label: value(formData, "crew_call_label"),
    doors_label: value(formData, "doors_label"),
    show_start_label: value(formData, "show_start_label"),
    strike_label: value(formData, "strike_label"),
    production_note: value(formData, "production_note")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdmin();
}

export async function createCrewProfile(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("crew_profiles").insert({
    clerk_user_id: value(formData, "clerk_user_id"),
    full_name: value(formData, "full_name"),
    default_role: value(formData, "default_role") || "Crew",
    phone: nullableValue(formData, "phone")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdmin();
}

export async function createAssignment(formData: FormData) {
  const supabase = await requireAdmin();
  const gigId = value(formData, "gig_id");
  const crewProfileId = value(formData, "crew_profile_id");
  const role = value(formData, "role");
  const details = value(formData, "details") || `${role} assignment`;

  const { error: replaceError } = await supabase
    .from("crew_assignments")
    .delete()
    .eq("gig_id", gigId)
    .eq("role", role)
    .neq("crew_profile_id", crewProfileId);

  if (replaceError) {
    throw new Error(replaceError.message);
  }

  const { error } = await supabase.from("crew_assignments").upsert(
    {
      gig_id: gigId,
      crew_profile_id: crewProfileId,
      role,
      details
    },
    { onConflict: "gig_id,crew_profile_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  await notifyCrewAssignment({ crewProfileId, details, gigId, role });
  revalidateAdmin();
}

export async function createTimelineItem(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("gig_timeline_items").insert({
    gig_id: value(formData, "gig_id"),
    sort_order: Number(value(formData, "sort_order") || 0),
    time_label: value(formData, "time_label"),
    label: value(formData, "label")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdmin();
}

export async function createGigDocument(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("gig_documents").insert({
    gig_id: value(formData, "gig_id"),
    label: value(formData, "label"),
    kind: value(formData, "kind") || "File",
    url: value(formData, "url")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdmin();
}

export async function createGigContact(formData: FormData) {
  const supabase = await requireAdmin();

  const { error } = await supabase.from("gig_contacts").insert({
    gig_id: value(formData, "gig_id"),
    name: value(formData, "name"),
    role: value(formData, "role"),
    email: nullableValue(formData, "email"),
    phone: nullableValue(formData, "phone")
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidateAdmin();
}

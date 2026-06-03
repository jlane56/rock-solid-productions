"use server";

import { auth } from "@clerk/nextjs/server";
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

  const { error } = await supabase.from("crew_assignments").upsert(
    {
      gig_id: value(formData, "gig_id"),
      crew_profile_id: value(formData, "crew_profile_id"),
      role: value(formData, "role"),
      details: value(formData, "details")
    },
    { onConflict: "gig_id,crew_profile_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

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

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function escapeCalendarText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export async function GET(_: Request, { params }: { params: { gigId: string } }) {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const { userId } = clerkEnabled ? await auth() : { userId: "local-demo-user" };

  if (clerkEnabled && !userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  let gig = {
    id: params.gigId,
    title: "Dunlap Summer Kickoff",
    venue_name: "North Park Bandshell",
    starts_at: "2026-06-13T19:00:00.000Z",
    ends_at: "2026-06-14T03:00:00.000Z",
    production_note: "Crew call at 2:00 PM. Stage audio assignment. Rain plan active."
  };

  if (supabase) {
    const { data } = await supabase
      .from("production_gigs")
      .select("id, title, venue_name, starts_at, ends_at, production_note")
      .eq("id", params.gigId)
      .maybeSingle();

    if (data) {
      gig = data;
    }
  }

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Rock Solid Productions//Crew Portal//EN",
    "BEGIN:VEVENT",
    `UID:rsp-${gig.id}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${new Date(gig.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTEND:${new Date(gig.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `SUMMARY:${escapeCalendarText(`RSP Crew Call: ${gig.title}`)}`,
    `LOCATION:${escapeCalendarText(gig.venue_name)}`,
    `DESCRIPTION:${escapeCalendarText(gig.production_note)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="rsp-${params.gigId}.ics"`
    }
  });
}

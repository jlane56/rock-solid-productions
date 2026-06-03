"use client";

import { useMemo, useState } from "react";
import type { AdminClerkUser } from "@/lib/admin/data";

export function ClerkUserFields({ users }: { users: AdminClerkUser[] }) {
  const [selectedId, setSelectedId] = useState(users[0]?.id ?? "");
  const selectedUser = useMemo(() => users.find((user) => user.id === selectedId) ?? users[0], [selectedId, users]);

  return (
    <>
      <label>
        Clerk User
        <select
          name="clerk_user_id"
          required
          disabled={users.length === 0}
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {users.map((user) => (
            <option value={user.id} key={user.id}>
              {user.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Name
        <input name="full_name" placeholder="Crew member name" defaultValue={selectedUser?.name ?? ""} required />
      </label>
    </>
  );
}

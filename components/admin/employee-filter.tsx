"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/select";

type MemberOption = {
  id: string;
  fullName: string;
  email: string;
  status?: string;
};

export function EmployeeFilter({
  members,
  value,
}: {
  members: MemberOption[];
  value?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("employee", next);
    else params.delete("employee");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="w-full sm:w-56">
      <Select
        aria-label="Filter by employee"
        value={value ?? ""}
        onChange={(event) => handleChange(event.target.value)}
      >
        <option value="">All team members</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.fullName || member.email}
            {member.status && member.status !== "active"
              ? ` (${member.status})`
              : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}

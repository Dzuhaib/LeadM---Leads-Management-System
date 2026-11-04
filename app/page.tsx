import { redirect } from "next/navigation";
import { getCurrentDbUser, homePathFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  if (user.status === "pending") redirect("/pending");
  if (user.status === "deactivated") redirect("/pending?state=deactivated");
  redirect(homePathFor(user));
}

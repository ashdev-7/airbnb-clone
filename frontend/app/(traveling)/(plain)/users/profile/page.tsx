import type { Metadata } from "next";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata: Metadata = { title: "Profile" };

/** The signed-in user's profile, read-only (plan §6.15). */
export default function ProfilePage() {
  return <ProfileView />;
}

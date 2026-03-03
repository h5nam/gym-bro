import { createClient } from "@/lib/supabase/server";
import ProfilePage from "@/components/profile/ProfilePage";

export default async function ProfileRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, height_cm, birth_year, training_goal, experience_level"
    )
    .eq("id", user.id)
    .single();

  return (
    <ProfilePage
      initialProfile={{
        email: user.email ?? "",
        displayName: profile?.display_name ?? "사용자",
        heightCm: profile?.height_cm ? Number(profile.height_cm) : null,
        birthYear: profile?.birth_year ?? null,
        trainingGoal: profile?.training_goal ?? null,
        experienceLevel: profile?.experience_level ?? null,
      }}
    />
  );
}

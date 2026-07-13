import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LandingPage } from "@/components/landing/LandingPage"
import { fontBody } from "@/components/landing/tokens"

export default async function HomePage() {
  // Signed-in users go straight to the app.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <main style={{ fontFamily: fontBody }}>
      <LandingPage />
    </main>
  )
}

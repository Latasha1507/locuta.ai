import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Baloo_2, Nunito } from "next/font/google"
import { LandingPage } from "@/components/landing/LandingPage"

// Design-system fonts (self-hosted via next/font — no external font request).
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
})

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
})

export default async function HomePage() {
  // Signed-in users go straight to the app.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  return (
    <main
      className={`${baloo.variable} ${nunito.variable}`}
      style={{ fontFamily: "var(--font-nunito), 'Nunito', system-ui, sans-serif" }}
    >
      <LandingPage />
    </main>
  )
}

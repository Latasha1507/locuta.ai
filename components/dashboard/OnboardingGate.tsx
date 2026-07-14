'use client'

import { useRouter } from 'next/navigation'
import OnboardingForm from '@/components/OnboardingForm'

// OnboardingForm needs an onComplete callback, which a server component can't
// pass. This thin client wrapper bridges that and refreshes the server data
// instead of doing a full window.location.reload().
export function OnboardingGate({ userId }: { userId: string }) {
  const router = useRouter()
  return <OnboardingForm userId={userId} onComplete={() => router.refresh()} />
}

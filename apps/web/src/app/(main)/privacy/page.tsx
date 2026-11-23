import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Privacy Policy' }

const SECTIONS = [
  {
    heading: 'What we collect',
    body: [
      'Account details: your email address, and the name and profile image provided by Google or GitHub if you sign in with them.',
      'Usage data you create: saved builds, saved comparisons and your plan status.',
      'Payment details are handled by Stripe. Decar never sees or stores your full card number.',
    ],
  },
  {
    heading: 'How we use it',
    body: [
      'To sign you in, provide the features of your plan, save your work and send sign-in links by email. We do not sell your personal data.',
    ],
  },
  {
    heading: 'Service providers',
    body: [
      'We rely on Stripe (payments), Google and GitHub (sign-in), our database and hosting providers, and an email provider for magic links. Each receives only the data needed for its role.',
    ],
  },
  {
    heading: 'Cookies',
    body: [
      'We use essential cookies to keep you signed in. The compare feature stores the vehicle you picked in your browser’s local storage; it never leaves your device until you save a comparison.',
    ],
  },
  {
    heading: 'Your choices',
    body: [
      'You can view and delete your builds and comparisons from your account, cancel your subscription from the billing portal, and ask us to delete your account and associated data.',
    ],
  },
]

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" updated="November 2026" sections={SECTIONS} />
}

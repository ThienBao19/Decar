import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal/LegalPage'

export const metadata: Metadata = { title: 'Terms of Service' }

const SECTIONS = [
  {
    heading: '1. Using Decar',
    body: [
      'Decar provides vehicle specifications, 3D viewers, comparisons and a vehicle builder. By creating an account or using the site you agree to these terms.',
      'You must provide accurate account information and keep your sign-in method secure. You are responsible for activity on your account.',
    ],
  },
  {
    heading: '2. Plans and billing',
    body: [
      'Decar offers a Free plan and a paid Pro plan billed monthly through Stripe. Pro renews automatically until you cancel.',
      'You can cancel at any time from the billing portal on your dashboard. Cancellation takes effect at the end of the current billing period, and Pro features remain available until then.',
    ],
  },
  {
    heading: '3. Vehicle data',
    body: [
      'Specifications are compiled from public sources such as NHTSA and fueleconomy.gov and may be incomplete or out of date. Decar is for information only; always confirm details with the manufacturer or dealer before a purchase.',
    ],
  },
  {
    heading: '4. Your content',
    body: [
      'Builds and comparisons you save belong to you. Builds stay private unless you share them; sharing a build makes it viewable by anyone signed in who has the link.',
    ],
  },
  {
    heading: '5. Acceptable use',
    body: [
      'Do not scrape the service at scale, attempt to bypass plan limits or access controls, or use Decar to break any law.',
    ],
  },
  {
    heading: '6. Changes and termination',
    body: [
      'We may update these terms or the service. We may suspend accounts that violate these terms. You may delete your account at any time.',
    ],
  },
]

export default function TermsPage() {
  return <LegalPage title="Terms of Service" updated="November 2026" sections={SECTIONS} />
}

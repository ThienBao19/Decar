export type SubscriptionTier = 'FREE' | 'PRO'

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'UNPAID'
  | 'CANCELED'
  | 'TRIALING'

export interface SubscriptionDTO {
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodEnd: string | null
}

export interface UserDTO {
  id: string
  email: string
  name: string | null
  image: string | null
  subscription: SubscriptionDTO
}

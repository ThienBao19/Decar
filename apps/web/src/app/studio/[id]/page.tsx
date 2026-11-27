import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getModel } from '@/lib/model-registry'

import { StudioClient } from './StudioClient'

interface Props {
  params: { id: string }
  searchParams: { snapshot?: string; view?: string }
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: `${getModel(params.id)?.title ?? 'Model'} — Studio` }
}

export default function StudioPage({ params, searchParams }: Props) {
  const model = getModel(params.id)
  if (!model?.studio) notFound()
  return (
    <main className="h-screen w-screen bg-[#1d1f23]">
      <StudioClient model={model} isSnapshot={searchParams.snapshot === '1'} view={searchParams.view} />
    </main>
  )
}

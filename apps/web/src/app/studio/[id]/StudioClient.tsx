'use client'

import dynamic from 'next/dynamic'

import type { ModelEntry } from '@/lib/model-registry'
import { VIEWS, type ViewName } from '@/components/viewer/studio/views'

const StudioViewer = dynamic(() => import('@/components/viewer/StudioViewer').then((m) => m.StudioViewer), { ssr: false })

interface Props {
  model: ModelEntry
  isSnapshot: boolean
  view?: string | undefined
}

export function StudioClient({ model, isSnapshot, view }: Props) {
  const initialView = VIEWS.some((v) => v.name === view) ? (view as ViewName) : 'front34'
  return <StudioViewer model={model} title={model.title} isSnapshot={isSnapshot} initialView={initialView} />
}

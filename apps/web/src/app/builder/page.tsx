'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { VEHICLE_CATEGORIES } from '@decar/shared'

import { useBuilderStore } from '@/store/builder-store'
import { PartsPanel } from '@/components/builder/PartsPanel'
import { PerformanceBar } from '@/components/builder/PerformanceBar'

const BuilderViewer = dynamic(
  () => import('@/components/builder/BuilderViewer').then((m) => m.BuilderViewer),
  { ssr: false, loading: () => <div className='flex h-full items-center justify-center text-[13px] text-[#333]'>Loading 3D…</div> },
)

export default function BuilderPage() {
  const router = useRouter()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)

  const { config, isDirty, isSaving, saveError, savedId, setBaseBody, setName, save } = useBuilderStore(
    useShallow((s) => ({
      config: s.config,
      isDirty: s.isDirty,
      isSaving: s.isSaving,
      saveError: s.saveError,
      savedId: s.savedId,
      setBaseBody: s.setBaseBody,
      setName: s.setName,
      save: s.save,
    })),
  )

  const handleSave = useCallback(async () => {
    try {
      const id = await save()
      const url = `${window.location.origin}/builder?id=${id}`
      setShareUrl(url)
    } catch {
      // saveError is set by the store
    }
  }, [save])

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2000)
  }, [shareUrl])

  const handleDriveIt = () => router.push('/drive')

  return (
    <main className='flex h-screen flex-col bg-[#080808] text-[#fafafa]'>
      {/* Header */}
      <header className='flex h-14 shrink-0 items-center justify-between border-b border-[#1e1e1e] px-6'>
        <div className='flex items-center gap-4'>
          <span className='text-[13px] font-semibold tracking-widest'>VEHICLE BUILDER</span>
          <span className='rounded border border-[#2e2e2e] px-2 py-0.5 text-[10px] text-[#4d4d4d]'>BETA</span>
          <input
            value={config.name}
            onChange={(e) => setName(e.target.value)}
            className='rounded border border-transparent bg-transparent px-2 py-0.5 text-[12px] text-[#666] outline-none transition hover:border-[#2a2a2a] focus:border-[#444] focus:text-[#e0e0e0]'
            maxLength={48}
            aria-label='Build name'
          />
        </div>
        <div className='flex items-center gap-2'>
          {saveError && <span className='text-[10px] text-[#ff4444]'>{saveError}</span>}
          {isDirty && !isSaving && <span className='text-[10px] text-[#555]'>unsaved</span>}
          {savedId && shareUrl && (
            <button
              onClick={handleCopyLink}
              className='rounded-md border border-[#2e2e2e] bg-[#111] px-3 py-1.5 text-[11px] text-[#888] transition hover:text-[#ccc]'
            >
              {copyDone ? 'Copied!' : 'Share Link'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={[
              'rounded-md border px-4 py-1.5 text-[12px] transition',
              isSaving || !isDirty
                ? 'cursor-not-allowed border-[#2e2e2e] bg-[#111] text-[#555]'
                : 'border-[#3a3a3a] bg-[#1a1a1a] text-[#e0e0e0] hover:border-[#555]',
            ].join(' ')}
          >
            {isSaving ? 'Saving…' : savedId ? 'Update Build' : 'Save Build'}
          </button>
          <button
            onClick={handleDriveIt}
            className='rounded-md border border-[#ff4400]/40 bg-[#ff4400]/10 px-4 py-1.5 text-[12px] text-[#ff6600] transition hover:bg-[#ff4400]/20'
          >
            Drive It →
          </button>
        </div>
      </header>

      <div className='flex flex-1 overflow-hidden'>
        {/* Left sidebar */}
        <aside className='flex w-72 shrink-0 flex-col border-r border-[#1e1e1e] bg-[#0c0c0c]'>
          <div className='shrink-0 border-b border-[#1e1e1e] p-3'>
            <p className='mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#444]'>Base Body</p>
            <div className='grid grid-cols-3 gap-1'>
              {(Object.entries(VEHICLE_CATEGORIES) as Array<[string, { label: string }]>).map(([cat, meta]) => (
                <button
                  key={cat}
                  onClick={() => setBaseBody(cat as never)}
                  className={[
                    'rounded-md border py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-colors',
                    config.baseBodyCategory === cat
                      ? 'border-[#ff4400]/60 bg-[#1a0800] text-[#ff6600]'
                      : 'border-[#1e1e1e] text-[#444] hover:border-[#333] hover:text-[#888]',
                  ].join(' ')}
                >
                  {meta.label}
                </button>
              ))}
            </div>
          </div>
          <div className='flex-1 overflow-hidden'>
            <PartsPanel />
          </div>
        </aside>

        {/* 3D Viewer */}
        <section className='relative flex-1 overflow-hidden'>
          <BuilderViewer />
        </section>
      </div>

      <PerformanceBar />
    </main>
  )
}

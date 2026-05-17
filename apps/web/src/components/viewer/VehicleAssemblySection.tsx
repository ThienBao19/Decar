'use client'
import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { byType } from './assembly/parts'
import type { PartDef } from './assembly/parts'
import type { SceneHandle } from './assembly/scene'
const Viewer = dynamic(() => import('./VehicleAssemblyViewer'), { ssr: false })
type Tab = 'wheel' | 'spoiler'
const DEFAULTS: Record<Tab, string> = { wheel: 'cadillac-w', spoiler: 'no-sp' }
export default function VehicleAssemblySection() {
  const [tab, setTab] = useState<Tab>('wheel')
  const [handle, setHandle] = useState<SceneHandle | null>(null)
  const [sel, setSel] = useState(DEFAULTS)
  const onReady = useCallback((h: SceneHandle) => { setHandle(h) }, [])
  const pick = (def: PartDef) => {
    if (!handle) return
    const { type } = def
    if (type === 'wheel') handle.swapWheels(def)
    else handle.swapSpoiler(def)
    setSel((prev) => ({ ...prev, [type]: def.id }))
  }
  return (
    <section className="rounded-xl bg-[#0f1520] p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Assembly Workshop</h2>
      <div className="h-72 rounded-lg overflow-hidden">
        <Viewer onReady={onReady} />
      </div>
      <div className="flex gap-2 pb-2 border-b border-white/10">
        {(['wheel', 'spoiler'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
            {t === 'wheel' ? 'Wheels' : 'Spoiler'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {byType(tab).map((def) => (
          <button key={def.id} onClick={() => pick(def)}
            className={`p-3 rounded-lg text-left text-sm transition-colors ${sel[tab] === def.id ? 'bg-blue-600/30 border border-blue-500' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}>
            <div className="font-medium text-white">{def.make}</div>
            <div className="text-white/50 text-xs mt-0.5">{def.label}</div>
          </button>
        ))}
      </div>
    </section>
  )
}

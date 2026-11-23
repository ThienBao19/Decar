'use client'

import Script from 'next/script'

export default function PreviewP911() {
  return (
    <>
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
      />

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; }
        .preview-root { background: #0a0a0a; color: #fff; font-family: monospace; height: 100vh; display: flex; flex-direction: column; }
        .preview-header { padding: 16px 24px; border-bottom: 1px solid #222; display: flex; align-items: center; gap: 12px; }
        .badge { background: #3ecf8e18; border: 1px solid #3ecf8e44; color: #3ecf8e; padding: 2px 10px; border-radius: 99px; font-size: 11px; }
        model-viewer { width: 100%; flex: 1; background: #0f0f0f; display: block; min-height: 0; }
        .preview-footer { padding: 10px 24px; border-top: 1px solid #1a1a1a; font-size: 11px; color: #444; display: flex; gap: 24px; }
      `}</style>

      <div className="preview-root">
        <header className="preview-header">
          <span style={{ fontSize: 13, color: '#888' }}>DECAR</span>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ fontSize: 14 }}>Porsche 911 (992 Turbo S)</span>
          <span className="badge">3D Preview</span>
          <span className="badge">Blender 5.1 generated</span>
        </header>

        <model-viewer
          src="/models/porsche-911-992.glb"
          camera-controls=""
          auto-rotate=""
          auto-rotate-delay="0"
          rotation-per-second="20deg"
          shadow-intensity="1.5"
          shadow-softness="1"
          exposure="1.1"
          environment-image="legacy"
          alt="Porsche 911 Turbo S 3D model"
          camera-orbit="45deg 70deg 8m"
          min-camera-orbit="auto auto 3m"
          max-camera-orbit="auto auto 15m"
          style={{ width: '100%', flex: 1 }}
        />

        <footer className="preview-footer">
          <span>260 objects · 34 materials · 2.29 MB GLB</span>
          <span>Procedural · GT Silver Metallic · Blender 5.1 PBR</span>
          <span>Scroll to zoom · Drag to orbit</span>
        </footer>
      </div>
    </>
  )
}

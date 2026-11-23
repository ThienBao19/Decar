import type { FastifyInstance } from 'fastify'
import type { VehicleDetailDTO } from '@decar/shared'

import { requireAuth } from '../../middleware/requireAuth.js'
import { requireTier } from '../../middleware/requireTier.js'
import { getVehicle } from '../../services/vehicle.service.js'

export function exportRoutes(app: FastifyInstance): Promise<void> {
  // GET /vehicles/:id/export/pdf
  // Returns a print-optimised HTML page. In production the browser's
  // native Print → Save as PDF gives the best fidelity (no puppeteer dep).
  app.get('/:id/export/pdf', {
    preHandler: [requireAuth, requireTier('PRO')],
    handler: async (req, reply) => {
      const { id } = req.params as { id: string }

      const vehicle = await getVehicle(app.prisma, app.redis, id, 'PRO')
      if (!vehicle) {
        return reply.status(404).send({ error: 'Vehicle not found', statusCode: 404 })
      }

      const html = buildPdfHtml(vehicle)
      return reply
        .status(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .header('Cache-Control', 'private, no-store')
        .send(html)
    },
  })
  return Promise.resolve()
}

function buildPdfHtml(v: VehicleDetailDTO): string {
  const title = `${v.year} ${v.make} ${v.model}${v.trimLevel ? ` ${v.trimLevel}` : ''}`
  const generated = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escHtml(title)} — Decar Spec Sheet</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         font-size: 11pt; color: #111; background: #fff; padding: 24mm 20mm; }
  h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4px; }
  h2 { font-size: 13pt; font-weight: 600; margin: 20px 0 8px;
       padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; color: #374151; }
  .meta { font-size: 9pt; color: #6b7280; margin-bottom: 20px; }
  .tag { display: inline-block; border: 1px solid #e5e7eb; border-radius: 99px;
         padding: 1px 8px; font-size: 9pt; color: #6b7280; margin-right: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10pt; }
  td:first-child { color: #6b7280; width: 45%; }
  td:last-child { font-weight: 500; }
  .colors { display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap; }
  .color-swatch { display: flex; align-items: center; gap: 6px; font-size: 9pt; }
  .swatch { width: 16px; height: 16px; border-radius: 50%; border: 1px solid #e5e7eb; }
  .footer { margin-top: 32px; font-size: 8pt; color: #9ca3af;
            border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @media print {
    body { padding: 0; }
    @page { margin: 20mm; size: A4; }
  }
</style>
</head>
<body>
<h1>${escHtml(title)}</h1>
<div class="meta">
  <span class="tag">${escHtml(v.market)}</span>
  ${v.exterior?.bodyType ? `<span class="tag">${escHtml(v.exterior.bodyType)}</span>` : ''}
  ${v.engine?.fuelType ? `<span class="tag">${escHtml(v.engine.fuelType)}</span>` : ''}
  <span style="margin-left:8px">Generated ${escHtml(generated)} · Decar Pro</span>
</div>

${v.engine ? `
<h2>Engine</h2>
<table>
  <tr><td>Displacement</td><td>${v.engine.displacement}L</td></tr>
  <tr><td>Cylinders</td><td>${v.engine.cylinders}</td></tr>
  <tr><td>Fuel type</td><td>${escHtml(v.engine.fuelType)}</td></tr>
  <tr><td>Power</td><td>${v.engine.powerKw > 0 ? `${v.engine.powerKw} kW (${Math.round(v.engine.powerKw * 1.341)} hp)` : '—'}</td></tr>
  <tr><td>Torque</td><td>${v.engine.torqueNm > 0 ? `${v.engine.torqueNm} Nm` : '—'}</td></tr>
  <tr><td>Transmission</td><td>${escHtml(v.engine.transmission)}</td></tr>
  <tr><td>Drivetrain</td><td>${escHtml(v.engine.drivetrain)}</td></tr>
</table>` : ''}

${v.exterior ? `
<h2>Exterior Dimensions</h2>
<table>
  <tr><td>Body type</td><td>${escHtml(v.exterior.bodyType)}</td></tr>
  <tr><td>Length</td><td>${v.exterior.lengthMm} mm</td></tr>
  <tr><td>Width</td><td>${v.exterior.widthMm} mm</td></tr>
  <tr><td>Height</td><td>${v.exterior.heightMm} mm</td></tr>
  <tr><td>Wheelbase</td><td>${v.exterior.wheelbaseMm} mm</td></tr>
</table>` : ''}

${v.exterior?.colors.length ? `
<h2>Paint Colors</h2>
<div class="colors">
  ${v.exterior.colors.map((c) => `
    <div class="color-swatch">
      <span class="swatch" style="background:${escHtml(c.hexCode)}"></span>
      <span>${escHtml(c.name)}</span>
    </div>
  `).join('')}
</div>` : ''}

${v.interior ? `
<h2>Interior</h2>
<table>
  <tr><td>Seat material</td><td>${escHtml(v.interior.seatMaterial)}</td></tr>
  <tr><td>Rows / seats</td><td>${v.interior.seatRows} rows / ${v.interior.seatCount} seats</td></tr>
  <tr><td>Dashboard</td><td>${escHtml(v.interior.dashboard)}</td></tr>
  ${v.interior.techFeatures.length ? `<tr><td>Tech features</td><td>${v.interior.techFeatures.map((f) => escHtml(f)).join(', ')}</td></tr>` : ''}
</table>` : ''}

<div class="footer">Decar · decar.io · This spec sheet was generated for a Pro subscriber. Do not redistribute.</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
}

function escHtml(s: string | number): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

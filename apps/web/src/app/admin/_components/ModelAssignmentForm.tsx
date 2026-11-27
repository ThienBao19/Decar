import { listStudioModels } from '@/lib/model-registry'

import { setVehicleModel } from '../actions'
import { SMALL_BTN } from './ListControls'

interface Props {
  vehicleId: string
  assignment: { assetId: string | null } | null
  // What the vehicle shows today, so "Automatic" says what it resolves to
  resolvedId: string | null
}

// Server-rendered form: works without client JS, the action re-checks admin rights
export function ModelAssignmentForm({ vehicleId, assignment, resolvedId }: Props) {
  const current = assignment ? (assignment.assetId ?? 'none') : 'auto'
  return (
    <form action={setVehicleModel} className="flex items-center gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <select name="choice" defaultValue={current} className="rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs">
        <option value="auto">Automatic{!assignment ? ` (${resolvedId ?? 'photos'})` : ''}</option>
        <option value="none">Photos only</option>
        {listStudioModels().map((m) => (
          <option key={m.id} value={m.id}>{m.title}</option>
        ))}
      </select>
      <button type="submit" className={SMALL_BTN}>Save</button>
    </form>
  )
}

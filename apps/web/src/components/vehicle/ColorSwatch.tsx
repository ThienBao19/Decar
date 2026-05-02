import type { ColorDTO } from '@decar/shared'

interface Props {
  color: ColorDTO
}

export function ColorSwatch({ color }: Props) {
  return (
    <div className="group relative flex flex-col items-center gap-1">
      <div
        className="h-8 w-8 rounded-full border-2 border-white shadow ring-1 ring-gray-200"
        style={{ backgroundColor: color.hexCode }}
        title={color.name}
      />
      <span className="max-w-[4rem] truncate text-center text-xs text-gray-500">{color.name}</span>
      {color.isPrimary && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand-500 ring-1 ring-white" />
      )}
    </div>
  )
}

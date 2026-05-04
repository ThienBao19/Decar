import type { ColorDTO } from '@decar/shared'

interface Props {
  color: ColorDTO
}

export function ColorSwatch({ color }: Props) {
  return (
    <div className="group relative flex flex-col items-center gap-1.5">
      <div
        className="relative h-9 w-9 rounded-full border-2 border-[#2e2e2e] ring-1 ring-[#242424] transition-transform group-hover:scale-110"
        style={{ backgroundColor: color.hexCode }}
        title={color.name}
      />
      <span className="max-w-[4rem] truncate text-center text-[11px] text-[#4d4d4d] group-hover:text-[#898989]">
        {color.name}
      </span>
      {color.isPrimary && (
        <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#3ecf8e] ring-2 ring-[#1c1c1c]" />
      )}
    </div>
  )
}

interface Section {
  heading: string
  body: string[]
}

interface Props {
  title: string
  updated: string
  sections: Section[]
}

export function LegalPage({ title, updated, sections }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-[36px] font-normal text-[#fafafa]">{title}</h1>
      <p className="mt-2 text-[13px] text-[#4d4d4d]">Last updated {updated}</p>
      <div className="mt-12 space-y-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-[16px] font-medium text-[#fafafa]">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 text-[14px] leading-relaxed text-[#898989]">{p}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  )
}

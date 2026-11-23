import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[#242424] bg-[#0f0f0f]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#3ecf8e]">
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1L12 4V10L7 13L2 10V4L7 1Z"
                    stroke="#0f0f0f"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  <circle cx="7" cy="7" r="2" fill="#0f0f0f" />
                </svg>
              </span>
              <span className="text-[14px] font-medium text-[#fafafa]">Decar</span>
            </div>
            <p className="text-[13px] text-[#4d4d4d]">Vehicle Intelligence Platform</p>
          </div>

          {/* Links */}
          <nav className="flex gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium uppercase tracking-[1.2px] text-[#4d4d4d]">
                Product
              </p>
              <Link href="/vehicles" className="text-[13px] text-[#898989] hover:text-[#fafafa]">
                Vehicles
              </Link>
              <Link href="/pricing" className="text-[13px] text-[#898989] hover:text-[#fafafa]">
                Pricing
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium uppercase tracking-[1.2px] text-[#4d4d4d]">
                Legal
              </p>
              <Link href="/terms" className="text-[13px] text-[#898989] hover:text-[#fafafa]">
                Terms
              </Link>
              <Link href="/privacy" className="text-[13px] text-[#898989] hover:text-[#fafafa]">
                Privacy
              </Link>
              <Link href="/credits" className="text-[13px] text-[#898989] hover:text-[#fafafa]">
                3D Credits
              </Link>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-[#242424] pt-6">
          <p className="text-center text-[12px] text-[#4d4d4d]">
            © {new Date().getFullYear()} Decar. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

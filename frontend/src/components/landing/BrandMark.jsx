import { Stethoscope } from "lucide-react"

export default function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex h-10 w-10 items-center justify-center bg-[#2b2018] text-white transition-colors duration-200 group-hover:bg-[#b07645] sm:h-11 sm:w-11">
        <Stethoscope className="h-5 w-5" />
      </div>
      <p
        className={`text-lg font-semibold tracking-[-0.02em] sm:text-xl ${dark ? 'text-white' : 'text-[#2b2018]'}`}
        style={{ fontFamily: '"Spectral", Georgia, serif' }}
      >
        Bourgelat
      </p>
    </div>
  )
}

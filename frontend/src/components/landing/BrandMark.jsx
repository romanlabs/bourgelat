import { Stethoscope } from "lucide-react"

export default function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <div className="flex h-10 w-10 items-center justify-center bg-[#2b2018] text-white transition-colors duration-200 group-hover:bg-[#b07645] sm:h-11 sm:w-11">
        <Stethoscope className="h-5 w-5" />
      </div>
      <div>
        <p className={`text-base font-semibold tracking-[-0.03em] sm:text-lg ${dark ? 'text-white' : 'text-[#2b2018]'}`}>
          Bourgelat
        </p>
        <p
          className={`hidden text-[11px] uppercase tracking-[0.22em] sm:block ${
            dark ? 'text-[#d9a06b]' : 'text-[#b07645]'
          }`}
        >
          Plataforma para clínicas veterinarias
        </p>
      </div>
    </div>
  )
}

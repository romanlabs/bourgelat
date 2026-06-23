export default function SectionHeading({ eyebrow, title, body, dark = false, center = false, compact = false }) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} max-w-3xl`}>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
          dark ? 'text-[#d9a06b]' : 'text-[#b07645]'
        }`}
      >
        {eyebrow}
      </p>
      <h2
        className={`leading-[0.98] tracking-[-0.04em] ${
          compact
            ? 'mt-3 text-[1.9rem] sm:text-[2.2rem] md:text-[2.5rem]'
            : 'mt-4 text-[2.7rem] sm:text-5xl md:text-6xl'
        } ${dark ? 'text-white' : 'text-[#2b2018]'}`}
        style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
      >
        {title}
      </h2>
      <p
        className={`text-[15px] leading-7 sm:text-lg sm:leading-8 ${
          compact ? 'mt-4 text-base sm:text-[17px] sm:leading-7' : 'mt-5'
        } ${center && compact ? 'mx-auto max-w-xl' : ''} ${
          dark ? 'text-white/70' : 'text-[#6b5d4d]'
        }`}
      >
        {body}
      </p>
    </div>
  )
}

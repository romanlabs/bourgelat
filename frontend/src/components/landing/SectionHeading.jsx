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
        className={`mt-4 leading-[0.96] tracking-[-0.04em] ${
          compact
            ? 'text-[2rem] sm:text-[2.4rem] md:text-[2.8rem]'
            : 'text-[2.7rem] sm:text-5xl md:text-6xl'
        } ${dark ? 'text-white' : 'text-[#2b2018]'}`}
        style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
      >
        {title}
      </h2>
      <p
        className={`mt-5 text-[15px] leading-7 sm:text-lg sm:leading-8 ${
          dark ? 'text-white/70' : 'text-[#6b5d4d]'
        }`}
      >
        {body}
      </p>
    </div>
  )
}

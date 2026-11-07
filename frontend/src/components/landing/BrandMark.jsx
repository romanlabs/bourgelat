// Marca provisional mientras no hay logo: el nombre, en el color del campo.
export default function BrandMark({ className = '' }) {
  return (
    <span className={`text-xl font-semibold tracking-[-0.03em] ${className}`}>Bourgelat</span>
  )
}

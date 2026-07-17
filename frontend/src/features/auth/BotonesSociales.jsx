const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const oauthHabilitado = import.meta.env.VITE_OAUTH_ENABLED === 'true'

const PROVEEDORES = [
  { id: 'google', label: 'Google' },
  { id: 'microsoft', label: 'Microsoft' },
]

function GoogleIcon() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  )
}

function ProviderIcon({ id }) {
  if (id === 'google') return <GoogleIcon />
  if (id === 'microsoft') return <MicrosoftIcon />
  return null
}

export default function BotonesSociales({ contexto = 'registro' }) {
  const accion = contexto === 'login' ? 'Continuar' : 'Registrarme'
  if (!oauthHabilitado) return null
  return (
    <div className="flex flex-col gap-2">
      {PROVEEDORES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => window.location.assign(`${API_URL}/auth/oauth/${id}`)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-none border border-[#2b2018]/15 bg-transparent px-4 text-sm font-medium text-[#2b2018] transition hover:border-[#2b2018]/30 hover:bg-[#2b2018]/[0.03]"
        >
          <ProviderIcon id={id} />
          {accion} con {label}
        </button>
      ))}
    </div>
  )
}

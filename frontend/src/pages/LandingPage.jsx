import { useEffect } from 'react'

import LandingNav from '@/components/landing/LandingNav'
import HeroProducto from '@/components/landing/HeroProducto'
import ProgramaPorDentro from '@/components/landing/ProgramaPorDentro'
import BandaHechos from '@/components/landing/BandaHechos'
import PreguntasFrecuentes from '@/components/landing/PreguntasFrecuentes'
import CierreRegistro from '@/components/landing/CierreRegistro'
import LandingFooter from '@/components/landing/LandingFooter'
import WhatsAppFab from '@/components/landing/WhatsAppFab'

// Landing «Petróleo y blanco»: cada sección es un capítulo de un solo color.
// Los textos viven en components/landing/contenido.js.
export default function LandingPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-sans text-foreground antialiased">
      <LandingNav />
      <main>
        <HeroProducto />
        <ProgramaPorDentro />
        <BandaHechos />
        <PreguntasFrecuentes />
        <CierreRegistro />
      </main>
      <LandingFooter />
      <WhatsAppFab />
    </div>
  )
}

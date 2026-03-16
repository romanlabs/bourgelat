import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { Stethoscope, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLogin } from '@/features/auth/useAuth'
import loginHero from '@/assets/login-hero.jpg'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending } = useLogin()

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = (data) => login(data)

  return (
    <div className="min-h-screen bg-[#0d1117] flex">

      {/* Panel izquierdo — imagen */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Imagen de fondo */}
        <img
          src={loginHero}
          alt="VetNova"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay oscuro degradado */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1117]/60 via-[#0d1117]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117]/80 via-transparent to-transparent" />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 h-full flex flex-col justify-between p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VetNova</span>
          </div>

          {/* Texto inferior */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-3 leading-tight">
              Gestiona tu clínica<br />
              <span className="text-emerald-400">con confianza</span>
            </h1>
            <p className="text-white/60 text-base max-w-sm">
              Software veterinario diseñado para Colombia. Rápido, seguro e intuitivo.
            </p>

            {/* Stats */}
            <div className="flex gap-6 mt-8">
              {[
                { value: '500+', label: 'Clínicas' },
                { value: '50k+', label: 'Mascotas' },
                { value: '99.9%', label: 'Uptime' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold text-emerald-400">{s.value}</p>
                  <p className="text-xs text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-hidden">
            {/* Luces animadas */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 opacity-[0.07] rounded-full blur-3xl animate-pulse pointer-events-none" />
<div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400 opacity-[0.05] rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }} />
<div className="absolute top-1/2 right-0 w-48 h-48 bg-emerald-600 opacity-[0.04] rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '3s' }} />


            {/* Línea de luz vertical sutil */}
            <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/15 to-transparent pointer-events-none" />

        <div className="w-full max-w-sm relative z-10">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">VetNova</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Bienvenido de nuevo</h2>
          <p className="text-white/40 text-sm mb-8">Ingresa a tu clínica en VetNova</p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/90">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="clinica@email.com"
                  className={`w-full bg-white/5 border rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.email ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-white/90">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`w-full bg-white/5 border rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.password ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 mt-1"
            >
              {isPending ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-emerald-400 hover:underline">
              Registra tu clínica
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
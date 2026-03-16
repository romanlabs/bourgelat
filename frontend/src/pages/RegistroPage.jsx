import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  Stethoscope, Mail, Lock, Eye, EyeOff, Building2,
  Phone, MapPin, Hash, ChevronRight, ChevronLeft, Check
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useRegistro } from '@/features/auth/useAuth'
import colombia from '@/data/colombia'
import registroHero from '@/assets/registro-hero.jpg'

const step1Schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  nit: z.string().optional(),
  departamento: z.string().min(1, 'Selecciona un departamento'),
  ciudad: z.string().min(2, 'Selecciona una ciudad'),
})

const step2Schema = z.object({
  email: z.string().email('Email inválido'),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
})

const step3Schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar: z.string(),
}).refine((d) => d.password === d.confirmar, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmar'],
})

const schemas = [step1Schema, step2Schema, step3Schema]
const PASOS = ['Tu clínica', 'Contacto', 'Acceso']

const InputField = ({ icon: Icon, label, error, optional, children, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-white/90">
      {label} {optional && <span className="text-white/40 font-normal">(opcional)</span>}
    </label>
    {children ?? (
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />}
        <input
          {...props}
          className={`w-full bg-white/5 border rounded-lg ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${error ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`}
        />
      </div>
    )}
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
)

export default function RegistroPage() {
  const [paso, setPaso] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [datos, setDatos] = useState({})

  const [departamentos, setDepartamentos] = useState([])
  const [ciudades, setCiudades] = useState([])
  const [loadingDeps, setLoadingDeps] = useState(false)
  const [loadingCiudades, setLoadingCiudades] = useState(false)
  const [depSeleccionado, setDepSeleccionado] = useState('')

  const { mutate: registro, isPending } = useRegistro()

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(schemas[paso]),
  })

  // Cargar departamentos al montar
useEffect(() => {
  if (paso === 0) {
    setDepartamentos(colombia)
  }
}, [paso])

// Cargar ciudades al seleccionar departamento
useEffect(() => {
  if (!depSeleccionado && depSeleccionado !== 0) return
  const dep = colombia.find(d => d.id === depSeleccionado)
  if (dep) {
    setCiudades(dep.ciudades.map((c, i) => ({ id: i, name: c })))
    setValue('ciudad', '')
  }
}, [depSeleccionado])

  const onSubmit = (data) => {
    const acumulado = { ...datos, ...data }
    if (paso < 2) {
      setDatos(acumulado)
      setPaso(paso + 1)
    } else {
      const { confirmar, ...payload } = acumulado
      registro(payload)
    }
  }

  const selectClass = (error) =>
    `w-full bg-white/5 border rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none transition-colors appearance-none ${error ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl min-h-[600px] flex rounded-2xl overflow-hidden shadow-2xl">

        {/* Panel izquierdo */}
        <div className="hidden lg:flex w-2/5 flex-col items-center justify-center p-10 relative overflow-hidden bg-[#0d1117] border-r border-white/5">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Luz principal — centro izquierdo */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500 opacity-15 rounded-full blur-3xl animate-pulse" />
                {/* Luz secundaria — esquina superior */}
                <div className="absolute -top-10 -left-10 w-64 h-64 bg-emerald-400 opacity-8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
                {/* Luz terciaria — esquina inferior */}
                <div className="absolute -bottom-10 right-0 w-56 h-56 bg-emerald-600 opacity-10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
                {/* Línea de luz vertical sutil */}
                <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />
            </div>
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">VetNova</h1>
            <p className="text-white/50 text-sm max-w-xs">
              Registra tu clínica en 3 simples pasos
            </p>
            <div className="mt-10 flex flex-col gap-5 text-left">
              {PASOS.map((p, i) => (
                <div key={p} className={`flex items-center gap-4 transition-all duration-500 ${i === paso ? 'opacity-100 translate-x-0' : i < paso ? 'opacity-70' : 'opacity-30'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-300 ${i < paso ? 'bg-emerald-500 text-white' : i === paso ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20' : 'bg-white/10 text-white/50'}`}>
                    {i < paso ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${i === paso ? 'text-white' : 'text-white/50'}`}>{p}</p>
                    {i === paso && (
                      <p className="text-xs text-emerald-400 mt-0.5">En progreso</p>
                    )}
                    {i < paso && (
                      <p className="text-xs text-emerald-500 mt-0.5">Completado</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className="flex-1 bg-[#0d1117] flex items-center justify-center p-8 overflow-y-auto relative">
            {/* Luz de fondo sutil en el formulario */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500 opacity-5 rounded-full blur-3xl pointer-events-none" />
          <div className="w-full max-w-sm">

            {/* Logo mobile */}
            <div className="flex items-center gap-3 mb-6 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">VetNova</span>
            </div>

            {/* Pasos mobile */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              {PASOS.map((p, i) => (
                <div key={p} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= paso ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/50'}`}>
                    {i < paso ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < PASOS.length - 1 && (
                    <div className={`h-px w-6 transition-colors ${i < paso ? 'bg-emerald-500' : 'bg-white/10'}`} />
                  )}
                </div>
              ))}
            </div>

            <h2 className="text-xl font-bold text-white mb-1">
              {paso === 0 && 'Datos de tu clínica'}
              {paso === 1 && 'Información de contacto'}
              {paso === 2 && 'Crea tu contraseña'}
            </h2>
            <p className="text-white/40 text-sm mb-6">Paso {paso + 1} de 3</p>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

              {/* ── Paso 1 ── */}
              {paso === 0 && (
                <>
                  <InputField icon={Building2} label="Nombre de la clínica" error={errors.nombre?.message}
                    {...register('nombre')} placeholder="Clínica Veterinaria San Roque" />

                  <InputField icon={Hash} label="NIT" optional error={errors.nit?.message}
                    {...register('nit')} placeholder="900123456-7" />

                  {/* Departamento */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/90">Departamento</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                      <select
                        {...register('departamento')}
                        onChange={(e) => {
                            const dep = colombia.find(d => d.departamento === e.target.value)
                            setDepSeleccionado(dep?.id ?? '')
                            setValue('departamento', e.target.value)
                            }}
                        className={selectClass(errors.departamento)}
                        style={{ backgroundColor: '#0d1117' }}
                      >
                        <option value="">
                          {loadingDeps ? 'Cargando departamentos...' : 'Selecciona tu departamento'}
                        </option>
                        {departamentos.map(d => (
                          <option key={d.id} value={d.departamento} style={{ backgroundColor: '#0d1117' }}>{d.departamento}</option>
                        ))}
                      </select>
                    </div>
                    {errors.departamento && <p className="text-xs text-red-400">{errors.departamento.message}</p>}
                  </div>

                  {/* Ciudad */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/90">Ciudad / Municipio</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10" />
                      <select
                        {...register('ciudad')}
                        disabled={!depSeleccionado || loadingCiudades}
                        className={`${selectClass(errors.ciudad)} disabled:opacity-40`}
                        style={{ backgroundColor: '#0d1117' }}
                      >
                        <option value="">
                          {loadingCiudades ? 'Cargando ciudades...' : !depSeleccionado ? 'Primero selecciona un departamento' : 'Selecciona tu ciudad'}
                        </option>
                        {ciudades.map(c => (
                          <option key={c.id} value={c.name} style={{ backgroundColor: '#0d1117' }}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    {errors.ciudad && <p className="text-xs text-red-400">{errors.ciudad.message}</p>}
                  </div>
                </>
              )}

              {/* ── Paso 2 ── */}
              {paso === 1 && (
                <>
                  <InputField icon={Mail} label="Email" error={errors.email?.message}
                    {...register('email')} type="email" placeholder="clinica@email.com" />
                  <InputField icon={Phone} label="Teléfono" optional error={errors.telefono?.message}
                    {...register('telefono')} placeholder="3001234567" />
                  <InputField icon={MapPin} label="Dirección" optional error={errors.direccion?.message}
                    {...register('direccion')} placeholder="Calle 10 # 5-23" />
                </>
              )}

              {/* ── Paso 3 ── */}
              {paso === 2 && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/90">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Mínimo 8 caracteres"
                        className={`w-full bg-white/5 border rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.password ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`} />
                      <button type="button" onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-white/90">Confirmar contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input {...register('confirmar')} type={showConfirmar ? 'text' : 'password'} placeholder="Repite tu contraseña"
                        className={`w-full bg-white/5 border rounded-lg pl-10 pr-12 py-3 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.confirmar ? 'border-red-500' : 'border-white/10 focus:border-emerald-500'}`} />
                      <button type="button" onClick={() => setShowConfirmar(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                        {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmar && <p className="text-xs text-red-400">{errors.confirmar.message}</p>}
                  </div>
                </>
              )}

              {/* Botones */}
              <div className="flex gap-3 mt-2">
                {paso > 0 && (
                  <Button type="button" onClick={() => setPaso(paso - 1)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </Button>
                )}
                <Button type="submit" disabled={isPending}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                  {paso < 2
                    ? <> Siguiente <ChevronRight className="w-4 h-4" /></>
                    : isPending ? 'Registrando...' : <> Crear clínica <Check className="w-4 h-4" /></>
                  }
                </Button>
              </div>
            </form>

            <p className="text-center text-sm text-white/40 mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'motion/react'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import colombia from '@/data/colombia'
import { useRegistro } from '@/features/auth/useAuth'

void motion

const INK = '#2b2018'
const ACCENT = '#b07645'

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/

const optionalField = (schema) => z.union([schema, z.literal('')])

const normalizarEmail = (valor = '') => valor.trim().toLowerCase()

const normalizarTelefonoColombiano = (valor = '') => {
  const soloNumeros = valor.replace(/\D/g, '')
  const sinPrefijo =
    soloNumeros.length > 10 && soloNumeros.startsWith('57')
      ? soloNumeros.slice(2)
      : soloNumeros

  return sinPrefijo.slice(0, 10)
}

const normalizarNit = (valor = '') => valor.replace(/[^\d-]/g, '').slice(0, 20)

const registroSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Escribe el nombre de la clinica').max(90, 'El nombre es demasiado largo'),
    nit: optionalField(
      z
        .string()
        .trim()
        .min(6, 'El NIT debe tener al menos 6 caracteres')
        .max(20, 'El NIT no puede superar 20 caracteres')
        .regex(/^[0-9-]+$/, 'Usa solo numeros y guion en el NIT')
    ),
    departamento: z.string().trim().min(1, 'Selecciona un departamento'),
    ciudad: z.string().trim().min(1, 'Selecciona una ciudad'),
    nombreAdministrador: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre del administrador')
      .max(90, 'El nombre es demasiado largo'),
    email: z.string().trim().email('Ingresa un email valido'),
    emailClinica: z.string().trim().email('Ingresa un email valido'),
    telefono: z.string().regex(/^3\d{9}$/, 'Ingresa un celular colombiano valido de 10 digitos'),
    direccion: optionalField(
      z
        .string()
        .trim()
        .min(6, 'La direccion es muy corta')
        .max(140, 'La direccion es demasiado larga')
    ),
    password: z
      .string()
      .refine(
        (value) => PASSWORD_REGEX.test(value),
        'Crea una contrasena fuerte con mayuscula, minuscula, numero y caracter especial'
      ),
    confirmar: z.string(),
  })
  .refine((values) => values.password === values.confirmar, {
    message: 'Las contrasenas no coinciden',
    path: ['confirmar'],
  })

const STEPS = [
  {
    label: 'Clinica',
    short: 'Identidad',
    title: 'Define la identidad y la sede principal de la clinica.',
    description: 'Registraremos el nombre comercial, el NIT y la ubicacion de la sede principal.',
    note: 'Esta informacion ayuda a personalizar documentos, reportes y configuraciones desde el primer ingreso.',
  },
  {
    label: 'Responsable',
    short: 'Contacto',
    title: 'Registra a la persona responsable de la operacion inicial.',
    description: 'Definiremos el correo institucional, el acceso del administrador y el celular principal.',
    note: 'El correo de la clinica y el celular principal son obligatorios para una operacion real y ambos se validan antes de guardar.',
  },
  {
    label: 'Seguridad',
    short: 'Acceso',
    title: 'Protege la cuenta de acceso con una clave robusta.',
    description: 'Al finalizar, la clinica quedara lista para ingresar al sistema con el acceso principal.',
    note: 'La contrasena debe cumplir las mismas reglas en la interfaz y en el backend antes de enviar el registro.',
  },
]

const STEP_FIELDS = [
  ['nombre', 'nit', 'departamento', 'ciudad'],
  ['nombreAdministrador', 'emailClinica', 'email', 'telefono', 'direccion'],
  ['password', 'confirmar'],
]




function PasswordRule({ valid, children }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-[#42524a]">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          valid ? 'bg-[#e6f4ec] text-[#3f8b63]' : 'bg-[#efe8df] text-[#7e786f]'
        }`}
      >
        <Check className="h-3 w-3" />
      </span>
      <span>{children}</span>
    </div>
  )
}

export default function RegistroPage() {
  const [paso, setPaso] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const { mutate: registro, isPending } = useRegistro()

  const {
    control,
    handleSubmit,
    register,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      nombre: '',
      nit: '',
      departamento: '',
      ciudad: '',
      nombreAdministrador: '',
      email: '',
      emailClinica: '',
      telefono: '',
      direccion: '',
      password: '',
      confirmar: '',
    },
    mode: 'onBlur',
  })

  const datos = useWatch({ control })
  const departamentoSeleccionado = useWatch({ control, name: 'departamento' })
  const carnetCompleto = Boolean(
    datos?.nombre && datos?.ciudad && datos?.nombreAdministrador && (datos?.emailClinica || datos?.email)
  )
  const passwordValue = useWatch({ control, name: 'password' }) || ''
  const ciudades =
    colombia.find((item) => item.departamento === departamentoSeleccionado)?.ciudades ?? []

  useEffect(() => {
    setValue('ciudad', '')
  }, [departamentoSeleccionado, setValue])

  const currentStep = STEPS[paso]
  const passwordChecks = [
    {
      key: 'length',
      label: 'Entre 8 y 72 caracteres',
      valid: passwordValue.length >= 8 && passwordValue.length <= 72,
    },
    {
      key: 'upper',
      label: 'Al menos una mayuscula',
      valid: /[A-Z]/.test(passwordValue),
    },
    {
      key: 'lower',
      label: 'Al menos una minuscula',
      valid: /[a-z]/.test(passwordValue),
    },
    {
      key: 'number',
      label: 'Al menos un numero',
      valid: /\d/.test(passwordValue),
    },
    {
      key: 'special',
      label: 'Un caracter especial',
      valid: /[^A-Za-z0-9]/.test(passwordValue),
    },
  ]
  const showPasswordGuide = paso === 2 && (passwordFocused || Boolean(passwordValue))

  const nombreField = register('nombre')
  const nitField = register('nit', {
    setValueAs: normalizarNit,
    onChange: (event) => {
      event.target.value = normalizarNit(event.target.value)
    },
  })
  const departamentoField = register('departamento')
  const ciudadField = register('ciudad')
  const nombreAdminField = register('nombreAdministrador')
  const emailField = register('email', { setValueAs: normalizarEmail })
  const emailClinicaField = register('emailClinica', { setValueAs: normalizarEmail })
  const telefonoField = register('telefono', {
    setValueAs: normalizarTelefonoColombiano,
    onChange: (event) => {
      event.target.value = normalizarTelefonoColombiano(event.target.value)
    },
  })
  const direccionField = register('direccion')
  const passwordField = register('password')
  const confirmarField = register('confirmar')

  const stepper = (
    <div className="flex items-center gap-0">
      {STEPS.map((step, index) => {
        const isActive = index === paso
        const isDone = index < paso
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center text-[11px] font-bold transition-colors ${
                isActive ? 'bg-[#b07645] text-white' : isDone ? 'bg-[#2b2018] text-white' : 'border border-[#2b2018]/20 text-[#2b2018]/40'
              }`}>
                {isDone ? <Check className="h-3 w-3" /> : `0${index + 1}`}
              </span>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                isActive ? 'text-[#2b2018]' : isDone ? 'text-[#2b2018]/60' : 'text-[#2b2018]/30'
              }`}>{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`mx-3 h-px w-8 transition-colors ${isDone ? 'bg-[#2b2018]/40' : 'bg-[#2b2018]/15'}`} />
            )}
          </div>
        )
      })}
    </div>
  )

  const handleNextStep = async () => {
    const fields = STEP_FIELDS[paso]
    const isValid = await trigger(fields)

    if (!isValid) return

    setPaso((current) => Math.min(current + 1, STEPS.length - 1))
  }

  const onSubmit = (data) => {
    const payload = {
      ...data,
      email: normalizarEmail(data.email),
      emailClinica: normalizarEmail(data.emailClinica),
      telefono: normalizarTelefonoColombiano(data.telefono),
      nit: normalizarNit(data.nit),
    }

    delete payload.confirmar
    registro(payload)
  }

  const inputCls = (hasError) =>
    `h-12 w-full border-0 border-b bg-transparent px-1 text-[15px] text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 ${hasError ? 'border-red-500' : 'border-[#2b2018]/20 focus:border-[#b07645]'}`

  const selectCls = (hasError) =>
    `h-12 w-full appearance-none border-0 border-b bg-transparent px-1 text-[15px] text-[#2b2018] outline-none transition ${hasError ? 'border-red-500' : 'border-[#2b2018]/20 focus:border-[#b07645]'}`

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#fdf6ee] text-[#2b2018]">

      <div className="mx-auto w-full max-w-[1520px] px-5 sm:px-8">
        <header className="flex items-center justify-between pb-2 pt-5">
          <Link to="/" className="group inline-flex items-center gap-3 text-[#2b2018] no-underline">
            <span className="flex h-9 w-9 items-center justify-center bg-[#2b2018] text-white transition-colors duration-200 group-hover:bg-[#b07645]">
              <Stethoscope className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-base font-semibold leading-none tracking-[-0.02em]">Bourgelat</span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                registro de clínica
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 text-sm sm:gap-3">
            <Link
              to="/"
              className="hidden items-center gap-1.5 text-[#2b2018]/50 no-underline transition-colors hover:text-[#2b2018] sm:inline-flex"
            >
              <ArrowLeft className="h-3 w-3" />
              Volver al inicio
            </Link>
            <div className="hidden h-4 w-px bg-[#2b2018]/15 sm:block" />
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 bg-[#2b2018] px-4 py-2.5 text-[13px] font-semibold tracking-[0.04em] text-white no-underline transition-colors duration-200 hover:bg-[#b07645]"
            >
              Ya tengo acceso
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </header>

      </div>

      <main className="relative z-10 flex flex-1 items-center overflow-hidden px-5 pb-6 sm:px-8">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-center gap-12 lg:gap-20">
          <motion.div
            key={paso}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px] border border-[#2b2018]/8 bg-white/95 px-8 py-8 backdrop-blur-sm"
            style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 -6px 20px rgba(43,32,24,0.05), 0 2px 4px rgba(43,32,24,0.04), 0 8px 20px rgba(43,32,24,0.08), 0 24px 56px rgba(43,32,24,0.10)' }}
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em]"
              style={{ color: ACCENT }}
            >
              <span className="h-px w-6" style={{ backgroundColor: ACCENT }} />
              Portal de registro
            </motion.p>

            <h1
              className="mt-3 text-[1.45rem] leading-[1.05] tracking-[-0.03em] text-[#2b2018]"
              style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
            >
              Activa la cuenta de tu clínica
            </h1>

            <div className="mt-5">{stepper}</div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" autoComplete="off">
              <input type="text" name="register-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
              <input type="password" name="register-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

              {paso === 0 ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Nombre de la clínica</label>
                    <input {...nombreField} type="text" autoComplete="organization" placeholder="Clínica Veterinaria Bourgelat" className={inputCls(errors.nombre)} />
                    {errors.nombre ? <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Departamento</label>
                      <select {...departamentoField} className={selectCls(errors.departamento)}>
                        <option value="">Selecciona</option>
                        {colombia.map((item) => (
                          <option key={item.id} value={item.departamento}>{item.departamento}</option>
                        ))}
                      </select>
                      {errors.departamento ? <p className="mt-1 text-sm text-red-600">{errors.departamento.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Ciudad</label>
                      <select {...ciudadField} disabled={!departamentoSeleccionado} className={`${selectCls(errors.ciudad)} disabled:opacity-50`}>
                        <option value="">{departamentoSeleccionado ? 'Selecciona' : '— elige depto primero'}</option>
                        {ciudades.map((ciudad) => (<option key={ciudad} value={ciudad}>{ciudad}</option>))}
                      </select>
                      {errors.ciudad ? <p className="mt-1 text-sm text-red-600">{errors.ciudad.message}</p> : null}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">NIT <span className="normal-case tracking-normal text-[#2b2018]/30">(opcional)</span></label>
                    <input {...nitField} type="text" inputMode="numeric" maxLength={20} placeholder="900123456-7" className={inputCls(errors.nit)} />
                    {errors.nit ? <p className="mt-1 text-sm text-red-600">{errors.nit.message}</p> : null}
                  </div>
                </div>
              ) : null}

              {paso === 1 ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Nombre del responsable</label>
                    <input {...nombreAdminField} type="text" autoComplete="name" placeholder="Nombre y apellido" className={inputCls(errors.nombreAdministrador)} />
                    {errors.nombreAdministrador ? <p className="mt-1 text-sm text-red-600">{errors.nombreAdministrador.message}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Email clínica</label>
                      <input {...emailClinicaField} type="email" inputMode="email" spellCheck={false} placeholder="contacto@tuclinica.com" className={inputCls(errors.emailClinica)} />
                      {errors.emailClinica ? <p className="mt-1 text-sm text-red-600">{errors.emailClinica.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Email admin</label>
                      <input {...emailField} type="email" inputMode="email" spellCheck={false} autoComplete="email" placeholder="tu@email.com" className={inputCls(errors.email)} />
                      {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Celular</label>
                      <input {...telefonoField} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} placeholder="3001234567" className={inputCls(errors.telefono)} />
                      {errors.telefono ? <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Dirección <span className="normal-case tracking-normal text-[#2b2018]/30">(opcional)</span></label>
                      <input {...direccionField} type="text" autoComplete="street-address" placeholder="Calle 10 # 5-23" className={inputCls(errors.direccion)} />
                      {errors.direccion ? <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {paso === 2 ? (
                <div className="space-y-5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Contraseña</label>
                    <div className="relative">
                      <input
                        {...passwordField}
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Crea una contraseña robusta"
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={(e) => { passwordField.onBlur(e); setPasswordFocused(false) }}
                        className={`${inputCls(errors.password)} pr-10`}
                      />
                      <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#2b2018]/55 transition hover:text-[#2b2018]" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2b2018]/55">Confirmar contraseña</label>
                    <div className="relative">
                      <input
                        {...confirmarField}
                        type={showConfirmar ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                        onPaste={(e) => e.preventDefault()}
                        onDrop={(e) => e.preventDefault()}
                        className={`${inputCls(errors.confirmar)} pr-10`}
                      />
                      <button type="button" onClick={() => setShowConfirmar((v) => !v)} className="absolute right-0 top-1/2 -translate-y-1/2 text-[#2b2018]/55 transition hover:text-[#2b2018]" aria-label={showConfirmar ? 'Ocultar' : 'Mostrar'}>
                        {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmar ? <p className="mt-1 text-sm text-red-600">{errors.confirmar.message}</p> : null}
                  </div>

                  <AnimatePresence>
                    {showPasswordGuide ? (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-2 border border-[#2b2018]/8 bg-[#fdf8f3] p-4"
                      >
                        {passwordChecks.map((rule) => (
                          <PasswordRule key={rule.key} valid={rule.valid}>{rule.label}</PasswordRule>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3 pt-2">
                {paso > 0 ? (
                  <button type="button" onClick={() => setPaso((c) => c - 1)} className="flex items-center gap-1.5 text-[13px] font-semibold text-[#2b2018]/50 transition hover:text-[#2b2018]">
                    <ChevronLeft className="h-4 w-4" />
                    Atrás
                  </button>
                ) : (
                  <span />
                )}

                {paso < STEPS.length - 1 ? (
                  <Button type="button" onClick={handleNextStep} className="group h-12 rounded-none bg-[#2b2018] px-8 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#3d2f24]">
                    Continuar
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isPending} className="group h-12 rounded-none bg-[#2b2018] px-8 text-sm font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#3d2f24]">
                    {isPending ? 'Creando...' : 'Crear cuenta'}
                    {!isPending ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                  </Button>
                )}
              </div>
            </form>

            <p className="mt-6 text-sm text-[#2b2018]/60">
              ¿Ya tienes acceso?{' '}
              <Link to="/login" className="font-semibold no-underline hover:underline" style={{ color: ACCENT }}>
                Ingresar a la plataforma
              </Link>
            </p>
          </motion.div>

          {/* ── Carnet de la clínica: credencial que se diligencia en vivo ── */}
          <motion.aside
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="hidden w-full max-w-[400px] shrink-0 lg:block"
            aria-hidden="true"
          >
            <div
              className="relative bg-[#2b2018] px-8 py-9 text-white"
              style={{ boxShadow: '0 8px 20px rgba(43,32,24,0.12), 0 24px 56px rgba(43,32,24,0.22), 0 48px 90px rgba(43,32,24,0.16)' }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em]" style={{ color: ACCENT }}>
                  <span className="h-px w-5" style={{ backgroundColor: ACCENT }} />
                  Credencial
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">Exp · 2026</span>
              </div>

              <div className={`mt-7 border-l-2 pl-4 transition-colors duration-300 ${paso === 0 ? 'border-[#b07645]' : 'border-white/10'}`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40">Clínica</p>
                <p
                  className="mt-1.5 text-[1.6rem] leading-[1.04] tracking-[-0.02em]"
                  style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                >
                  {datos?.nombre || <span className="text-white/25">Nombre de la clínica</span>}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-white/55">
                  <span>NIT · {datos?.nit || '—'}</span>
                  <span className="text-white/20">·</span>
                  <span>{datos?.ciudad && datos?.departamento ? `${datos.ciudad}, ${datos.departamento}` : 'Ubicación pendiente'}</span>
                </div>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className={`border-l-2 pl-4 transition-colors duration-300 ${paso === 1 ? 'border-[#b07645]' : 'border-white/10'}`}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/40">Responsable</p>
                <p className="mt-1.5 text-[15px]">
                  {datos?.nombreAdministrador || <span className="text-white/25">Por definir</span>}
                </p>
                <p className="mt-0.5 text-[13px] text-white/55">{datos?.emailClinica || datos?.email || 'correo@pendiente'}</p>
              </div>

              <div className="my-6 h-px bg-white/10" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white/45">
                  <span className="flex h-7 w-7 items-center justify-center bg-white/8">
                    <Stethoscope className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[11px] leading-tight">
                    Expedida por
                    <br />
                    <span className="text-white/65">Bourgelat</span>
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 ${paso === 2 ? 'text-[#b07645]' : 'text-white/30'}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Acceso
                </div>
              </div>

              <AnimatePresence>
                {carnetCompleto ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.4, rotate: -42 }}
                    animate={{ opacity: 1, scale: 1, rotate: -9 }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 13 }}
                    className="pointer-events-none absolute right-6 top-6 flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full border-2"
                    style={{ borderColor: 'rgba(176,118,69,0.65)', color: ACCENT }}
                  >
                    <span className="absolute inset-[5px] rounded-full border border-[#b07645]/30" />
                    <Check className="h-5 w-5" />
                    <span className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em]">Activa</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.aside>
        </div>
      </main>
    </div>
  )
}


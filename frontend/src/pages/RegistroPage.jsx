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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import BrandMark from '@/components/landing/BrandMark'
import colombia from '@/data/colombia'
import { useRegistro } from '@/features/auth/useAuth'

void motion

const INK = '#2b2018'
const ACCENT = '#b07645'
const EYEBROW = '#a35f25'
const REGISTRO_VIDEO_WEBM = '/videos/perro-registro-opt.webm'
const REGISTRO_VIDEO_MP4  = '/videos/perro-registro-opt.mp4'
const REGISTRO_POSTER     = '/videos/perro-registro-poster.webp'

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
    nombre: z.string().trim().min(2, 'Escribe el nombre de la clínica').max(90, 'El nombre es demasiado largo'),
    tipoPersona: z.enum(['persona_natural', 'persona_juridica'], {
      errorMap: () => ({ message: 'Selecciona el tipo de persona' }),
    }),
    nit: optionalField(
      z
        .string()
        .trim()
        .min(6, 'El NIT debe tener al menos 6 caracteres')
        .max(20, 'El NIT no puede superar 20 caracteres')
        .regex(/^[0-9-]+$/, 'Usa solo números y guion en el NIT')
    ),
    departamento: z.string().trim().min(1, 'Selecciona un departamento'),
    ciudad: z.string().trim().min(1, 'Selecciona una ciudad'),
    nombreAdministrador: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre del administrador')
      .max(90, 'El nombre es demasiado largo'),
    email: z.string().trim().email('Ingresa un email válido'),
    emailClinica: z.string().trim().email('Ingresa un email válido'),
    telefono: z.string().regex(/^3\d{9}$/, 'Ingresa un celular colombiano válido de 10 dígitos'),
    direccion: optionalField(
      z
        .string()
        .trim()
        .min(6, 'La dirección es muy corta')
        .max(140, 'La dirección es demasiado larga')
    ),
    password: z
      .string()
      .refine(
        (value) => PASSWORD_REGEX.test(value),
        'La contraseña aún no cumple todos los requisitos'
      ),
    confirmar: z.string(),
  })
  .refine((values) => values.password === values.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })

const STEPS = [
  {
    label: 'Clínica',
    description: 'Datos de tu clínica: nombre, tipo de persona, ubicación y NIT.',
  },
  {
    label: 'Responsable',
    description: 'Persona a cargo de la cuenta y datos de contacto de la clínica.',
  },
  {
    label: 'Seguridad',
    description: 'Crea una contraseña segura para proteger el acceso.',
  },
]

const STEP_FIELDS = [
  ['nombre', 'tipoPersona', 'nit', 'departamento', 'ciudad'],
  ['nombreAdministrador', 'emailClinica', 'email', 'telefono', 'direccion'],
  ['password', 'confirmar'],
]




function PasswordRule({ valid, children }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[#42524a]">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
          valid ? 'bg-[#e6f4ec] text-[#3f8b63]' : 'bg-[#efe8df] text-[#7e786f]'
        }`}
      >
        <Check className="h-2.5 w-2.5" />
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
      tipoPersona: 'persona_juridica',
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

  const departamentoSeleccionado = useWatch({ control, name: 'departamento' })
  const tipoPersonaSeleccionado = useWatch({ control, name: 'tipoPersona' })
  const passwordValue = useWatch({ control, name: 'password' }) || ''
  const ciudades =
    colombia.find((item) => item.departamento === departamentoSeleccionado)?.ciudades ?? []

  useEffect(() => {
    setValue('ciudad', '')
  }, [departamentoSeleccionado, setValue])

  const passwordChecks = [
    {
      key: 'length',
      label: 'Mínimo 8 caracteres',
      valid: passwordValue.length >= 8 && passwordValue.length <= 72,
    },
    {
      key: 'upper',
      label: 'Una mayúscula',
      valid: /[A-Z]/.test(passwordValue),
    },
    {
      key: 'lower',
      label: 'Una minúscula',
      valid: /[a-z]/.test(passwordValue),
    },
    {
      key: 'number',
      label: 'Un número',
      valid: /\d/.test(passwordValue),
    },
    {
      key: 'special',
      label: 'Un carácter especial',
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
    <div className="flex items-center">
      {STEPS.map((step, index) => {
        const isActive = index === paso
        const isDone = index < paso
        return (
          <div key={step.label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-300 ${
                isActive
                  ? 'bg-[#b07645] text-white shadow-[0_4px_12px_rgba(176,118,69,0.35)]'
                  : isDone
                    ? 'bg-[#2b2018] text-white'
                    : 'border border-[#2b2018]/20 text-[#2b2018]/40'
              }`}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
              </span>
              <span className={`hidden text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300 sm:inline ${
                isActive ? 'text-[#2b2018]' : isDone ? 'text-[#2b2018]/55' : 'text-[#2b2018]/30'
              }`}>{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="mx-3 h-px flex-1 overflow-hidden rounded-full bg-[#2b2018]/12">
                <div className={`h-full rounded-full bg-[#2b2018]/45 transition-all duration-500 ${isDone ? 'w-full' : 'w-0'}`} />
              </div>
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
    `h-10 w-full border-0 border-b bg-transparent px-0.5 text-[14px] text-[#2b2018] outline-none transition placeholder:text-[#2b2018]/35 ${hasError ? 'border-red-500' : 'border-[#2b2018]/20 focus:border-[#b07645]'}`

  const selectCls = (hasError) =>
    `h-10 w-full appearance-none border-0 border-b bg-transparent px-0.5 text-[14px] text-[#2b2018] outline-none transition ${hasError ? 'border-red-500' : 'border-[#2b2018]/20 focus:border-[#b07645]'}`

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden text-[#2b2018]"
      style={{
        // Degradado igualado al fondo real del video (crema), muestreado por
        // bandas verticales, para que el relleno empalme sin canto con el video.
        background: 'linear-gradient(180deg, #fad6a8 0%, #fcddb5 20%, #fce0b9 45%, #fcdfba 65%, #fce2c1 85%, #f9dcbc 100%)',
      }}
    >

      {/* ── Video de fondo: misma colocación que el hero del landing.
          object-contain + object-[right_bottom] muestra al perro completo
          (cabeza y patas) y su fondo beige funde con el degradado hero-bg. ── */}
      <video
        className="registro-bg-video absolute inset-x-0 bottom-0 top-auto h-[48dvh] w-full object-contain object-bottom sm:inset-0 sm:top-0 sm:h-full sm:object-[right_bottom]"
        style={{ transform: 'translateZ(0)' }}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={REGISTRO_POSTER}
        disablePictureInPicture
        aria-hidden="true"
      >
        <source src={REGISTRO_VIDEO_WEBM} type="video/webm" />
        <source src={REGISTRO_VIDEO_MP4} type="video/mp4" />
      </video>

      {/* Velo crema opaco a la izquierda, del MISMO color que el fondo del
          video (rgb 251,224,185). Cubre por completo el borde del object-contain
          y se desvanece antes del perro, así no queda ningún canto visible. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: 'linear-gradient(90deg, rgb(251,224,185) 0%, rgb(251,224,185) 44%, rgba(251,224,185,0.6) 54%, rgba(251,224,185,0) 64%)' }}
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-4">
          <Link to="/" className="group no-underline">
            <BrandMark />
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-[#2b2018] no-underline transition-[background-color,color] duration-[250ms] ease-out hover:bg-[rgba(43,32,24,0.06)] hover:text-[#b07645] sm:inline-flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <Link
              to="/login"
              className="group inline-flex h-10 items-center gap-2 rounded-md bg-[#2b2018] px-5 text-sm font-semibold tracking-[0.04em] text-[#fdf6ee] no-underline shadow-[0_4px_12px_rgba(43,32,24,0.18)] transition-colors duration-200 hover:bg-[#b07645]"
            >
              Iniciar sesión
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </header>

        <main className="flex min-h-0 flex-1 items-center pb-5 lg:pl-24 xl:pl-44">
          <motion.div
            key={paso}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[480px] rounded-[12px] border border-white/70 bg-white/95 px-7 py-6 backdrop-blur-md sm:px-9"
            style={{ boxShadow: '0 2px 4px rgba(43,32,24,0.04), 0 12px 30px rgba(43,32,24,0.10), 0 36px 80px rgba(43,32,24,0.16)' }}
          >
            <div className="w-full">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-[11px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: EYEBROW }}
            >
              Portal de registro
            </motion.p>

            <p className="mt-3 text-[13px] leading-5 text-[#6a5038]">
              {STEPS[paso].description}
            </p>

            <div className="mt-4">{stepper}</div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" autoComplete="off">
              <input type="text" name="register-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
              <input type="password" name="register-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />

              {paso === 0 ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Nombre de la clínica</label>
                    <input {...nombreField} type="text" autoComplete="organization" placeholder="Clínica Veterinaria Bourgelat" className={inputCls(errors.nombre)} />
                    {errors.nombre ? <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Tipo de persona</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'persona_natural', label: 'Persona natural' },
                        { value: 'persona_juridica', label: 'Persona jurídica' },
                      ].map((opcion) => {
                        const activo = tipoPersonaSeleccionado === opcion.value
                        return (
                          <button
                            key={opcion.value}
                            type="button"
                            aria-pressed={activo}
                            onClick={() => setValue('tipoPersona', opcion.value, { shouldValidate: true })}
                            className={`h-9 rounded-md border text-[13px] font-semibold transition-colors ${
                              activo
                                ? 'border-[#b07645] bg-[#b07645]/10 text-[#2b2018]'
                                : 'border-[#2b2018]/20 text-[#2b2018]/55 hover:border-[#2b2018]/40'
                            }`}
                          >
                            {opcion.label}
                          </button>
                        )
                      })}
                    </div>
                    {errors.tipoPersona ? <p className="mt-1 text-sm text-red-600">{errors.tipoPersona.message}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Departamento</label>
                      <select {...departamentoField} className={selectCls(errors.departamento)}>
                        <option value="">Selecciona</option>
                        {colombia.map((item) => (
                          <option key={item.id} value={item.departamento}>{item.departamento}</option>
                        ))}
                      </select>
                      {errors.departamento ? <p className="mt-1 text-sm text-red-600">{errors.departamento.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Ciudad</label>
                      <select {...ciudadField} disabled={!departamentoSeleccionado} className={`${selectCls(errors.ciudad)} disabled:opacity-50`}>
                        <option value="">{departamentoSeleccionado ? 'Selecciona' : 'Elige departamento'}</option>
                        {ciudades.map((ciudad) => (<option key={ciudad} value={ciudad}>{ciudad}</option>))}
                      </select>
                      {errors.ciudad ? <p className="mt-1 text-sm text-red-600">{errors.ciudad.message}</p> : null}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">NIT <span className="normal-case tracking-normal text-[#2b2018]/30">(opcional)</span></label>
                    <input {...nitField} type="text" inputMode="numeric" maxLength={20} placeholder="900123456-7" className={inputCls(errors.nit)} />
                    {errors.nit ? <p className="mt-1 text-sm text-red-600">{errors.nit.message}</p> : null}
                  </div>
                </div>
              ) : null}

              {paso === 1 ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Nombre del responsable</label>
                    <input {...nombreAdminField} type="text" autoComplete="name" placeholder="Nombre y apellido" className={inputCls(errors.nombreAdministrador)} />
                    {errors.nombreAdministrador ? <p className="mt-1 text-sm text-red-600">{errors.nombreAdministrador.message}</p> : null}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Email clínica</label>
                      <input {...emailClinicaField} type="email" inputMode="email" spellCheck={false} placeholder="contacto@tuclinica.com" className={inputCls(errors.emailClinica)} />
                      {errors.emailClinica ? <p className="mt-1 text-sm text-red-600">{errors.emailClinica.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Email admin</label>
                      <input {...emailField} type="email" inputMode="email" spellCheck={false} autoComplete="email" placeholder="tu@email.com" className={inputCls(errors.email)} />
                      {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Celular</label>
                      <input {...telefonoField} type="tel" inputMode="numeric" autoComplete="tel" maxLength={10} placeholder="3001234567" className={inputCls(errors.telefono)} />
                      {errors.telefono ? <p className="mt-1 text-sm text-red-600">{errors.telefono.message}</p> : null}
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Dirección <span className="normal-case tracking-normal text-[#2b2018]/30">(opcional)</span></label>
                      <input {...direccionField} type="text" autoComplete="street-address" placeholder="Calle 10 # 5-23" className={inputCls(errors.direccion)} />
                      {errors.direccion ? <p className="mt-1 text-sm text-red-600">{errors.direccion.message}</p> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {paso === 2 ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Contraseña</label>
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
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2b2018]/55">Confirmar contraseña</label>
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
                        className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-[#2b2018]/8 bg-[#fdf8f3] px-3.5 py-3"
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
                  <Button type="button" onClick={handleNextStep} className="group h-11 rounded-md bg-[#2b2018] px-7 text-sm font-semibold tracking-[0.04em] text-[#fdf6ee] shadow-[0_4px_12px_rgba(43,32,24,0.18)] transition-colors hover:bg-[#b07645]">
                    Continuar
                    <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isPending} className="group h-11 rounded-md bg-[#2b2018] px-7 text-sm font-semibold tracking-[0.04em] text-[#fdf6ee] shadow-[0_4px_12px_rgba(43,32,24,0.18)] transition-colors hover:bg-[#b07645]">
                    {isPending ? 'Creando...' : 'Crear cuenta'}
                    {!isPending ? <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /> : null}
                  </Button>
                )}
              </div>
            </form>

            <p className="mt-4 text-[13px] text-[#2b2018]/60">
              ¿Ya tienes acceso?{' '}
              <Link to="/login" className="font-semibold no-underline hover:underline" style={{ color: ACCENT }}>
                Ingresar a la plataforma
              </Link>
            </p>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}


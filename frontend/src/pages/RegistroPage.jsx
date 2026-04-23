import { createElement, useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'motion/react'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Hash,
  Lock,
  Mail,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from 'lucide-react'
import registerHero from '@/assets/auth/register-hero.webp'
import registerDetail from '@/assets/auth/register-detail.webp'
import registerExtraOwner from '@/assets/auth/register-extra-owner.webp'
import registerExtraUltrasound from '@/assets/auth/register-extra-ultrasound.webp'
import { Button } from '@/components/ui/button'
import colombia from '@/data/colombia'
import { useRegistro } from '@/features/auth/useAuth'

void motion

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

const READY_ITEMS = [
  {
    icon: Building2,
    title: 'Base administrativa preparada',
    body: 'Nombre, NIT y sede principal organizados para activar la cuenta.',
  },
  {
    icon: BadgeCheck,
    title: 'Contacto operativo validado',
    body: 'Correo institucional y celular principal listos para comunicaciones y alertas.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceso seguro desde el inicio',
    body: 'La cuenta de acceso queda protegida con reglas coherentes en todo el sistema.',
  },
]

const GALLERY_ITEMS = [
  {
    src: registerExtraOwner,
    alt: 'Tutor acompanando a su mascota durante una consulta veterinaria',
    eyebrow: 'Consulta con tutor',
    title: 'Atencion cercana para pacientes y acompanantes.',
  },
  {
    src: registerExtraUltrasound,
    alt: 'Equipo veterinario realizando un examen de apoyo diagnostico',
    eyebrow: 'Apoyo diagnostico',
    title: 'Procesos clinicos con tecnologia y seguimiento.',
  },
]

function FieldLabel({ children, hint }) {
  return (
    <div className="mb-2 flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-3">
      <label className="min-w-0 break-words text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7c847d] sm:text-[12px] sm:tracking-[0.16em]">
        {children}
      </label>
      {hint ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a867f] sm:text-[11px] sm:tracking-[0.14em]">
          {hint}
        </span>
      ) : null}
    </div>
  )
}

function InputShell({ icon: Icon, error, action, children }) {
  return (
    <div className="rounded-[28px] border border-[#ddd7cf] bg-[#fbf9f6] p-4 shadow-[0_18px_40px_rgba(41,34,28,0.05)]">
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6c7768]" />
        ) : null}
        {children}
        {action ? <div className="absolute right-4 top-1/2 -translate-y-1/2">{action}</div> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
    </div>
  )
}

function SummaryRow({ label, value }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-[#ddd7cf] bg-[#fcfaf7] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7e8c81]">
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm leading-6 text-[#2a302c]/72">{value}</p>
    </div>
  )
}

function FeatureRow({ icon, title, body }) {
  return (
    <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/12 text-[#f0e2d7]">
          {createElement(icon, { className: 'h-4 w-4' })}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1.5 text-sm leading-6 text-white/72">{body}</p>
        </div>
      </div>
    </div>
  )
}

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

  const draft = useWatch({ control })
  const departamentoSeleccionado = useWatch({ control, name: 'departamento' })
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
    <div className="grid gap-2 lg:grid-cols-3">
      {STEPS.map((step, index) => {
        const isActive = index === paso
        const isDone = index < paso

        return (
          <div
            key={step.label}
            className={`rounded-[24px] border px-4 py-4 transition ${
              isActive
                ? 'border-[#9db3a8] bg-[#f5faf7] shadow-[0_14px_30px_rgba(111,155,139,0.12)]'
                : isDone
                  ? 'border-[#d7e4dc] bg-[#f9fcfa]'
                  : 'border-[#e4ddd5] bg-[#fcfaf7]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] text-sm font-semibold ${
                  isActive
                    ? 'bg-[#6f9b8b] text-white'
                    : isDone
                      ? 'bg-[#30495f] text-white'
                      : 'bg-white text-[#7c847d]'
                }`}
              >
                {isDone ? <Check className="h-4 w-4" /> : `0${index + 1}`}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7c847d]">
                  {step.short}
                </p>
                <p className="mt-1 break-words text-sm font-medium text-[#1f2521]">{step.label}</p>
              </div>
            </div>
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

  return (
    <div className="min-h-screen overflow-hidden bg-[#f4efe8] text-[#1f2521]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_top,#fff7ef_0%,rgba(255,247,239,0.38)_46%,transparent_76%)]" />
        <div className="absolute -left-12 top-20 h-72 w-72 rounded-full bg-[#cfdccf]/45 blur-3xl" />
        <div className="absolute right-[-5rem] top-40 h-80 w-80 rounded-full bg-[#d7c0aa]/34 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(71,82,72,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(71,82,72,0.09) 1px, transparent 1px)',
            backgroundSize: '70px 70px',
            maskImage: 'radial-gradient(circle at center, black 38%, transparent 82%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-[1520px] px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <header className="flex flex-col gap-4 rounded-[30px] border border-[#e2dbd1] bg-white/78 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="inline-flex items-center gap-3 text-[#1f2521] no-underline">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#2f4d63_0%,#547f73_52%,#cda383_100%)] text-white shadow-[0_16px_36px_rgba(47,77,99,0.18)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-[-0.02em]">Bourgelat</p>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#5c655e]">
                onboarding de clinica
              </p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#ddd7cf] px-4 py-2 text-sm font-medium text-[#58645d] no-underline transition hover:border-[#c5b9ac] hover:text-[#1f2521]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#243447] px-4 py-2 text-sm font-semibold text-white no-underline transition hover:bg-[#192737]"
            >
              Ya tengo acceso
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="order-2 space-y-5 xl:order-1 xl:sticky xl:top-6 xl:self-start"
          >
            <div className="overflow-hidden rounded-[38px] border border-[#d8d1c9] bg-[#1f2b33] text-white shadow-[0_34px_90px_rgba(35,23,16,0.22)]">
              <div className="relative h-[400px] sm:h-[380px] lg:h-[360px]">
                <img
                  src={registerHero}
                  alt="Veterinario atendiendo a un perro en consulta"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,24,31,0.12)_0%,rgba(16,24,31,0.78)_100%)]" />
                <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f3e5d9] backdrop-blur-md sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.16em]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Cuenta de acceso
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f3e5d9] sm:text-[11px] sm:tracking-[0.18em]">
                      Registro inicial
                    </p>
                    <h1
                      className="mt-3 max-w-[8ch] text-[26px] leading-[0.98] tracking-[-0.04em] text-white sm:max-w-[9ch] sm:text-[34px] lg:text-[38px]"
                      style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                    >
                      Activa la cuenta de la clinica
                    </h1>
                    <p className="mt-3 max-w-[28ch] text-[13px] leading-6 text-white/76 sm:text-sm sm:leading-7">
                      Registra la sede, el responsable y el acceso inicial para empezar a operar.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[34px] border border-[#d8d1c9] bg-[linear-gradient(180deg,#26353f_0%,#1d2a32_100%)] p-5 text-white shadow-[0_22px_60px_rgba(35,23,16,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3e5d9]">
                  Lo que quedara habilitado
                </p>
                <div className="mt-4 space-y-3">
                  {READY_ITEMS.map((item) => (
                    <FeatureRow key={item.title} icon={item.icon} title={item.title} body={item.body} />
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="overflow-hidden rounded-[30px] border border-[#d8d1c9] bg-white shadow-[0_22px_52px_rgba(35,23,16,0.08)]">
                  <div className="relative h-52 sm:h-[220px] xl:h-52">
                    <img
                      src={registerDetail}
                      alt="Gatito siendo atendido en una clinica veterinaria"
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,28,0.1)_0%,rgba(18,24,28,0.72)_100%)]" />
                    <div className="absolute inset-x-4 bottom-4">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-md">
                        <PawPrint className="h-4 w-4" />
                        Bienestar felino y seguimiento cercano
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5">
                  {GALLERY_ITEMS.map((item) => (
                    <div
                      key={item.title}
                      className="overflow-hidden rounded-[26px] border border-[#d8d1c9] bg-white shadow-[0_18px_42px_rgba(35,23,16,0.08)]"
                    >
                      <div className="relative h-52 sm:h-[220px] xl:h-52">
                        <img src={item.src} alt={item.alt} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,28,0.08)_0%,rgba(18,24,28,0.78)_100%)]" />
                        <div className="absolute inset-x-4 bottom-4">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72">
                            {item.eyebrow}
                          </p>
                          <p className="mt-2 text-sm font-semibold leading-5 text-white">
                            {item.title}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.72, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="order-1 overflow-hidden rounded-[40px] border border-[#ddd7cf] bg-white/86 shadow-[0_34px_110px_rgba(35,23,16,0.16)] backdrop-blur-xl xl:order-2"
          >
            <div className="h-2 bg-[linear-gradient(90deg,#30495f_0%,#6f9b8b_56%,#d4a786_100%)]" />
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="border-b border-[#e4ddd5] pb-6">
                <div className="max-w-4xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dfd7] bg-[#fcfaf7] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c847d]">
                    <span className="h-2 w-2 rounded-full bg-[#84a393]" />
                    Registro de la clinica
                  </div>
                  <h2
                    className="mt-5 max-w-3xl text-[34px] leading-[0.96] tracking-[-0.04em] text-[#1f2521] sm:text-[46px] lg:text-[58px]"
                    style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                  >
                    Crea la cuenta de la clinica con datos reales y una configuracion clara desde el primer ingreso.
                  </h2>
                  <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#59655d]">
                    Registraremos la informacion base de la clinica, el contacto administrativo y el acceso inicial para que puedas empezar a operar sin fricciones.
                  </p>
                </div>
              </div>

              <div className="mt-6">{stepper}</div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" autoComplete="off">
        <input type="text" name="register-shadow-email" autoComplete="username" className="hidden" tabIndex={-1} />
        <input type="password" name="register-shadow-password" autoComplete="new-password" className="hidden" tabIndex={-1} />
        <section className="rounded-[36px] border border-[#e4ddd5] bg-[linear-gradient(180deg,#fffdfa_0%,#faf7f2_100%)] p-4 shadow-[0_22px_52px_rgba(35,23,16,0.07)] sm:p-5">
          <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="rounded-[30px] bg-[linear-gradient(180deg,#30495f_0%,#243746_100%)] p-5 text-white shadow-[0_24px_60px_rgba(35,23,16,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f3e5d9]">
                  Paso actual
                </p>
                <h2
                  className="mt-4 text-[30px] leading-[0.98] tracking-[-0.04em] sm:text-[34px]"
                  style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                >
                  {currentStep.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/72">{currentStep.description}</p>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white/10 text-[#f3e5d9]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-white/76">{currentStep.note}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#e4ddd5] bg-white p-4 shadow-[0_18px_42px_rgba(35,23,16,0.05)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7e8c81]">
                  Resumen de alta
                </p>
                <div className="mt-4 space-y-3">
                  <SummaryRow
                    label="Clinica"
                    value={draft.nombre || 'Nombre de la clinica pendiente'}
                  />
                  <SummaryRow
                    label="Ubicacion"
                    value={
                      draft.ciudad && draft.departamento
                        ? `${draft.ciudad}, ${draft.departamento}`
                        : 'Ubicacion pendiente'
                    }
                  />
                  <SummaryRow
                    label="Responsable"
                    value={draft.nombreAdministrador || 'Responsable pendiente'}
                  />
                  <SummaryRow
                    label="Contacto"
                    value={draft.emailClinica || draft.email || 'Correo pendiente'}
                  />
                </div>
              </div>
            </div>

              <div className="rounded-[30px] border border-[#e4ddd5] bg-white p-5 shadow-[0_18px_42px_rgba(35,23,16,0.05)] sm:p-6">
                <div className="flex flex-col gap-3 border-b border-[#e4ddd5] pb-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7e8c81]">
                      Bloque {paso + 1} de {STEPS.length}
                    </p>
                    <h3
                      className="mt-2 text-[26px] leading-[0.98] tracking-[-0.04em] text-[#1f2521] sm:text-[32px]"
                      style={{ fontFamily: '"Spectral", Georgia, serif', fontWeight: 700 }}
                    >
                      {currentStep.label}
                    </h3>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-[#5d6760]">
                    {currentStep.description}
                  </p>
                </div>

                <span className="inline-flex w-fit items-center justify-center self-start rounded-full border border-[#e8ded3] bg-[#fcf5ed] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9f7a5b]">
                  verificacion guiada
                </span>
              </div>

              <div className="mt-6">
                {paso === 0 ? (
                  <div className="grid gap-4">
                    <div>
                      <FieldLabel hint="requerido">Nombre de la clinica</FieldLabel>
                      <InputShell icon={Building2} error={errors.nombre?.message}>
                        <input
                          {...nombreField}
                          type="text"
                          autoComplete="organization"
                          placeholder="Clinica Veterinaria Bourgelat"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.nombre ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                    </div>

                    <div>
                      <FieldLabel hint="requerido">Departamento</FieldLabel>
                      <InputShell icon={MapPin} error={errors.departamento?.message}>
                        <select
                          {...departamentoField}
                          className={`h-14 w-full appearance-none rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.departamento ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        >
                          <option value="">Selecciona un departamento</option>
                          {colombia.map((item) => (
                            <option key={item.id} value={item.departamento}>
                              {item.departamento}
                            </option>
                          ))}
                        </select>
                      </InputShell>
                    </div>

                    <div>
                      <FieldLabel hint="requerido">Ciudad o municipio</FieldLabel>
                      <InputShell icon={MapPin} error={errors.ciudad?.message}>
                        <select
                          {...ciudadField}
                          disabled={!departamentoSeleccionado}
                          className={`h-14 w-full appearance-none rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.ciudad ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        >
                          <option value="">
                            {departamentoSeleccionado
                              ? 'Selecciona una ciudad'
                              : 'Primero elige un departamento'}
                          </option>
                          {ciudades.map((ciudad) => (
                            <option key={ciudad} value={ciudad}>
                              {ciudad}
                            </option>
                          ))}
                        </select>
                      </InputShell>
                    </div>

                    <div className="xl:max-w-[320px]">
                      <FieldLabel hint="opcional">NIT</FieldLabel>
                      <InputShell icon={Hash} error={errors.nit?.message}>
                        <input
                          {...nitField}
                          type="text"
                          inputMode="numeric"
                          maxLength={20}
                          placeholder="900123456-7"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.nit ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                    </div>
                  </div>
                ) : null}

                {paso === 1 ? (
                  <div className="grid gap-4">
                    <div>
                      <FieldLabel hint="requerido">Nombre del responsable</FieldLabel>
                      <InputShell icon={UserRound} error={errors.nombreAdministrador?.message}>
                        <input
                          {...nombreAdminField}
                          type="text"
                          autoComplete="name"
                          placeholder="Roman Bolanos"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.nombreAdministrador ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                    </div>

                    <div>
                      <FieldLabel hint="requerido">Email de la clinica</FieldLabel>
                      <InputShell icon={Mail} error={errors.emailClinica?.message}>
                        <input
                          {...emailClinicaField}
                          type="email"
                          inputMode="email"
                          spellCheck={false}
                          autoComplete="email"
                          placeholder="contacto@tuclinica.com"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.emailClinica ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                      <p className="mt-2 text-sm text-[#5d6760]">
                        Este sera el correo institucional para notificaciones y comunicacion con la clinica.
                      </p>
                    </div>

                    <div>
                      <FieldLabel hint="requerido">Email del administrador</FieldLabel>
                      <InputShell icon={Mail} error={errors.email?.message}>
                        <input
                          {...emailField}
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          spellCheck={false}
                          placeholder="roman@tuclinica.com"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.email ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                      <p className="mt-2 text-sm text-[#5d6760]">
                        Este correo se usara para iniciar sesion y administrar la cuenta de la clinica.
                      </p>
                    </div>

                    <div>
                      <FieldLabel hint="requerido">Celular principal</FieldLabel>
                      <InputShell icon={Phone} error={errors.telefono?.message}>
                        <input
                          {...telefonoField}
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          placeholder="3001234567"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.telefono ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                      <p className="mt-2 text-sm text-[#5d6760]">
                        Solo admitimos celulares colombianos validos de 10 digitos.
                      </p>
                    </div>

                    <div className="xl:max-w-[420px]">
                      <FieldLabel hint="opcional">Direccion</FieldLabel>
                      <InputShell icon={MapPin} error={errors.direccion?.message}>
                        <input
                          {...direccionField}
                          type="text"
                          autoComplete="street-address"
                          placeholder="Calle 10 # 5-23"
                          className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-4 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                            errors.direccion ? 'border-red-400' : 'border-[#ddd7cf]'
                          }`}
                        />
                      </InputShell>
                    </div>
                  </div>
                ) : null}

                {paso === 2 ? (
                  <div className="space-y-4">
                    <div className="grid max-w-2xl gap-4">
                      <div>
                        <FieldLabel hint="seguridad alta">Contrasena</FieldLabel>
                        <InputShell
                          icon={Lock}
                          error={errors.password?.message}
                          action={(
                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              className="text-[#6f766f] transition hover:text-[#1f2521]"
                              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        >
                          <input
                            {...passwordField}
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Crea una contrasena robusta"
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={(event) => {
                              passwordField.onBlur(event)
                              setPasswordFocused(false)
                            }}
                            className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-14 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                              errors.password ? 'border-red-400' : 'border-[#ddd7cf]'
                            }`}
                          />
                        </InputShell>
                      </div>

                      <div>
                        <FieldLabel hint="confirmacion">Confirmar contrasena</FieldLabel>
                        <InputShell
                          icon={Lock}
                          error={errors.confirmar?.message}
                          action={(
                            <button
                              type="button"
                              onClick={() => setShowConfirmar((value) => !value)}
                              className="text-[#6f766f] transition hover:text-[#1f2521]"
                              aria-label={showConfirmar ? 'Ocultar confirmacion' : 'Mostrar confirmacion'}
                            >
                              {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        >
                          <input
                            {...confirmarField}
                            type={showConfirmar ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="Repite la contrasena"
                            onPaste={(event) => event.preventDefault()}
                            onDrop={(event) => event.preventDefault()}
                            className={`h-14 w-full rounded-[20px] border bg-white pl-12 pr-14 text-[15px] text-[#1f2521] outline-none transition placeholder:text-[#8e948c] focus:border-[#93ab9c] focus:ring-4 focus:ring-[#93ab9c]/12 ${
                              errors.confirmar ? 'border-red-400' : 'border-[#ddd7cf]'
                            }`}
                          />
                        </InputShell>
                        <p className="mt-2 text-sm text-[#5d6760]">
                          Esta confirmacion debe escribirse manualmente para evitar errores al duplicar la clave de acceso.
                        </p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {showPasswordGuide ? (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.22 }}
                          className="max-w-xl rounded-[28px] border border-[#ddd7cf] bg-white p-5 shadow-[0_22px_54px_rgba(35,23,16,0.12)]"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7c847d]">
                            Requisitos de seguridad
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#58615a]">
                            Verifica estos puntos antes de continuar. La contrasena debe cumplirlos para guardar la cuenta de acceso.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {passwordChecks.map((rule) => (
                              <PasswordRule key={rule.key} valid={rule.valid}>
                                {rule.label}
                              </PasswordRule>
                            ))}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="sm:col-span-2">
                      <div className="rounded-[28px] border border-[#e7ddd3] bg-[linear-gradient(135deg,#fdf9f3_0%,#f5efe7_100%)] p-5">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-white text-[#9f7a5b]">
                            <ShieldCheck className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#3b2f27]">
                              Proteccion alineada en todo el sistema
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#635247]">
                              Las mismas reglas se validan aqui y en el servidor para evitar rechazos inesperados al finalizar el registro.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 rounded-[34px] border border-[#e4ddd5] bg-[#fcfaf7] p-5 shadow-[0_20px_46px_rgba(35,23,16,0.06)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="max-w-2xl text-sm leading-6 text-[#5d6760]">
            {paso === 0
              ? 'Usa el nombre con el que tu clinica se presenta a clientes, documentos y procesos internos.'
              : paso === 1
                ? 'Este contacto sera el punto principal para notificaciones, acceso y comunicaciones de la operacion diaria.'
                : 'Al completar este bloque, la cuenta de acceso quedara lista para ingresar al sistema con una contrasena segura.'}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {paso > 0 ? (
              <Button
                type="button"
                onClick={() => setPaso((current) => current - 1)}
                className="h-14 rounded-full border border-[#ddd7cf] bg-white px-6 text-sm font-semibold text-[#24322c] shadow-none transition hover:bg-[#f7f2ec]"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atras
              </Button>
            ) : null}

            {paso < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="h-14 rounded-full bg-[linear-gradient(135deg,#2d465d_0%,#547a6e_54%,#c59c7e_100%)] px-8 text-sm font-semibold text-white shadow-[0_20px_42px_rgba(45,70,93,0.22)] transition hover:opacity-95 lg:min-w-[220px]"
              >
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending}
                className="h-14 rounded-full bg-[linear-gradient(135deg,#2d465d_0%,#547a6e_54%,#c59c7e_100%)] px-8 text-sm font-semibold text-white shadow-[0_20px_42px_rgba(45,70,93,0.22)] transition hover:opacity-95 lg:min-w-[240px]"
              >
                {isPending ? 'Creando cuenta de la clinica...' : 'Crear cuenta de la clinica'}
                {!isPending ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
              </Button>
            )}
          </div>
        </section>
      </form>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}

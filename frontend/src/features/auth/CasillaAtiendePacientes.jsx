// «¿También atiendes pacientes?» al crear la clínica. Viene marcada: en la
// clínica pequeña el administrador suele ser el único veterinario, y sin ese
// rol no puede agendarse citas ni firmar historias.
export default function CasillaAtiendePacientes(props) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-input bg-card px-4 py-3 text-sm leading-5 text-foreground">
      <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-primary" {...props} />
      <span>
        <span className="font-semibold">También atiendo pacientes</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">
          Quedas como veterinario para agendarte citas y firmar historias. Puedes cambiarlo después en Usuarios.
        </span>
      </span>
    </label>
  )
}

// Nombre de quien hizo algo (veterinario, quien registró, quien vendió). Si ya
// salió del equipo se conserva el nombre y se aclara, para no dejar huecos en
// historias, citas y ventas viejas.
export const nombreAutor = (persona, sinNombre = '') => {
  if (!persona?.nombre) return sinNombre
  return persona.retiradoEn ? `${persona.nombre} (ya no está en el equipo)` : persona.nombre
}

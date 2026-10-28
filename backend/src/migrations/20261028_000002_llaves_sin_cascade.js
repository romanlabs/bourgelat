'use strict'

// Borrar un usuario, una mascota o un tutor no puede llevarse historias
// clínicas, citas ni facturas: son de la clínica y se conservan por ley. La
// base de producción se creó con sync y quedó con estas llaves en CASCADE
// (las migraciones decían RESTRICT). Se pasan a NO ACTION: bloquea el borrado
// directo, pero deja borrar una clínica completa (cuenta:borrar), porque la
// revisión se hace al final de la sentencia, cuando sus hijas ya se fueron.
const LLAVES = [
  { tabla: 'citas', columna: 'veterinarioId', padre: 'usuarios' },
  { tabla: 'facturas', columna: 'usuarioId', padre: 'usuarios' },
  { tabla: 'historias_clinicas', columna: 'veterinarioId', padre: 'usuarios' },
  { tabla: 'movimientos_inventario', columna: 'usuarioId', padre: 'usuarios' },
  { tabla: 'antecedentes_mascota', columna: 'mascotaId', padre: 'mascotas' },
  { tabla: 'citas', columna: 'mascotaId', padre: 'mascotas' },
  { tabla: 'examenes_laboratorio', columna: 'mascotaId', padre: 'mascotas' },
  { tabla: 'historias_clinicas', columna: 'mascotaId', padre: 'mascotas' },
  { tabla: 'citas', columna: 'propietarioId', padre: 'propietarios' },
  { tabla: 'facturas', columna: 'propietarioId', padre: 'propietarios' },
  { tabla: 'historias_clinicas', columna: 'propietarioId', padre: 'propietarios' },
  { tabla: 'mascotas', columna: 'propietarioId', padre: 'propietarios' },
]

const buscarRestricciones = (sequelize, { tabla, columna, padre }, reglaActual, transaction) =>
  sequelize.query(
    `SELECT DISTINCT rc.constraint_name AS nombre
       FROM information_schema.referential_constraints rc
       JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = rc.constraint_name
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = rc.constraint_name
      WHERE kcu.table_schema = 'public' AND kcu.table_name = :tabla AND kcu.column_name = :columna
        AND ccu.table_name = :padre AND rc.delete_rule = :reglaActual`,
    { replacements: { tabla, columna, padre, reglaActual }, type: 'SELECT', transaction }
  )

const cambiarRegla = async ({ queryInterface, transaction }, desde, hacia) => {
  const { sequelize } = queryInterface
  for (const llave of LLAVES) {
    const existe = await sequelize.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :tabla AND column_name = :columna`,
      { replacements: llave, type: 'SELECT', transaction }
    )
    if (existe.length === 0) continue

    const restricciones = await buscarRestricciones(sequelize, llave, desde, transaction)
    for (const { nombre } of restricciones) {
      await sequelize.query(`ALTER TABLE "${llave.tabla}" DROP CONSTRAINT "${nombre}"`, { transaction })
      await sequelize.query(
        `ALTER TABLE "${llave.tabla}" ADD CONSTRAINT "${nombre}" FOREIGN KEY ("${llave.columna}")
           REFERENCES "${llave.padre}" ("id") ON UPDATE CASCADE ON DELETE ${hacia}`,
        { transaction }
      )
    }
  }
}

module.exports = {
  name: '20261028_000002_llaves_sin_cascade',

  up: (contexto) => cambiarRegla(contexto, 'CASCADE', 'NO ACTION'),

  down: (contexto) => cambiarRegla(contexto, 'NO ACTION', 'CASCADE'),
}

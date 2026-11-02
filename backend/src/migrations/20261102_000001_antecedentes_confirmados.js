'use strict'

// «Sin registrar» deja de confundirse con «No»:
// - La esterilización pasa a vivir solo en mascotas, con tres estados (null es sin
//   registrar). Un false viejo era el valor por defecto, no una respuesta de nadie,
//   así que no se conserva; un true en cualquiera de las dos tablas sí.
// - antecedentes_mascota.esterilizado queda sin uso, con sus datos, por si hay que
//   revertir.
// - Sin alergias y sin medicación se confirman de forma explícita.
module.exports = {
  name: '20261102_000001_antecedentes_confirmados',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const columnas = await queryInterface.describeTable('antecedentes_mascota')
    if (columnas.sinAlergias) return

    await queryInterface.changeColumn(
      'mascotas',
      'esterilizado',
      { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: null },
      { transaction }
    )
    await queryInterface.sequelize.query(
      `UPDATE mascotas m
          SET esterilizado = CASE
            WHEN m.esterilizado = TRUE
              OR EXISTS (
                SELECT 1 FROM antecedentes_mascota a
                 WHERE a."mascotaId" = m.id AND a.esterilizado = TRUE
              )
            THEN TRUE
            ELSE NULL
          END`,
      { transaction }
    )
    for (const columna of ['sinAlergias', 'sinMedicacion']) {
      await queryInterface.addColumn(
        'antecedentes_mascota',
        columna,
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      )
    }
  },
}

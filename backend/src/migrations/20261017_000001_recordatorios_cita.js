'use strict'

// Recordatorio de cita al profesional por correo. La clínica elige si lo envía
// y con cuántos minutos de anticipación (15 a 2880). La marca de envío es un
// campo nuevo: `recordatorioEnviado` queda para los recordatorios a tutores.
module.exports = {
  name: '20261017_000001_recordatorios_cita',

  up: async ({ queryInterface, Sequelize, transaction }) => {
    const clinicas = await queryInterface.describeTable('clinicas', { transaction })
    if (!clinicas.recordatorioCitaActivo) {
      await queryInterface.addColumn('clinicas', 'recordatorioCitaActivo', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      }, { transaction })
    }
    if (!clinicas.recordatorioCitaMinutos) {
      await queryInterface.addColumn('clinicas', 'recordatorioCitaMinutos', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 60,
      }, { transaction })
      await queryInterface.sequelize.query(
        `ALTER TABLE clinicas ADD CONSTRAINT clinicas_recordatorio_cita_minutos_rango
         CHECK ("recordatorioCitaMinutos" BETWEEN 15 AND 2880)`,
        { transaction }
      )
    }

    const citas = await queryInterface.describeTable('citas', { transaction })
    if (!citas.recordatorioProfesionalEnviadoEn) {
      await queryInterface.addColumn('citas', 'recordatorioProfesionalEnviadoEn', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction })
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS citas_recordatorio_profesional_pendiente_idx
         ON citas ("fecha")
         WHERE "recordatorioProfesionalEnviadoEn" IS NULL AND estado = 'programada'`,
        { transaction }
      )
    }
  },

  down: async ({ queryInterface, transaction }) => {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS citas_recordatorio_profesional_pendiente_idx',
      { transaction }
    )
    const citas = await queryInterface.describeTable('citas', { transaction })
    if (citas.recordatorioProfesionalEnviadoEn) {
      await queryInterface.removeColumn('citas', 'recordatorioProfesionalEnviadoEn', { transaction })
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE clinicas DROP CONSTRAINT IF EXISTS clinicas_recordatorio_cita_minutos_rango',
      { transaction }
    )
    const clinicas = await queryInterface.describeTable('clinicas', { transaction })
    if (clinicas.recordatorioCitaMinutos) {
      await queryInterface.removeColumn('clinicas', 'recordatorioCitaMinutos', { transaction })
    }
    if (clinicas.recordatorioCitaActivo) {
      await queryInterface.removeColumn('clinicas', 'recordatorioCitaActivo', { transaction })
    }
  },
}

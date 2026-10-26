// Lista (o envía) los recordatorios de cobro de suscripciones por vencer o vencidas.
// Sin --enviar solo simula: no manda correos ni cambia ningún estado.
//
// Uso:
//   npm run cobro:pendientes
//   npm run cobro:pendientes -- --enviar

const dotenv = require('dotenv')

dotenv.config()

const sequelize = require('../config/database')
const { procesarRecordatorios } = require('../services/recordatoriosCobroService')

const leerArgs = () => ({ enviar: process.argv.slice(2).includes('--enviar') })

const main = async () => {
  const { enviar } = leerArgs()
  const { enviados, fallidos, filas } = await procesarRecordatorios({ simular: !enviar })

  console.log(enviar ? 'Recordatorios de cobro (envío real):' : 'Recordatorios de cobro (simulación, no se envía nada):')
  for (const fila of filas) {
    console.log(
      `- ${fila.clinica} | ${fila.plan} | ${fila.tipo} (${fila.dias}) | ${fila.fechaFin} | ` +
      `${fila.telefono || 'sin celular'} | ${fila.enlaceWhatsapp || 'sin celular'}`
    )
  }
  console.log(`\nTotal: ${filas.length} aviso(s).`)
  if (enviar) console.log(`Correos enviados: ${enviados}. Avisos fallidos: ${fallidos}.`)
  else console.log('Repite con --enviar para mandarlos.')
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(`Error: ${error.message}`)
    await sequelize.close()
    process.exit(1)
  })

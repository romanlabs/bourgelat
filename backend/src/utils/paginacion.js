// Parseo seguro de parametros de paginacion. Acota el limite a un maximo para
// evitar que un cliente pida ?limite=9999999 y fuerce consultas gigantes (DoS).

const LIMITE_MAXIMO = 100

const parseEnteroPositivo = (valor, porDefecto) => {
  const numero = Number.parseInt(valor, 10)
  return Number.isNaN(numero) || numero < 1 ? porDefecto : numero
}

const parsePaginacion = (
  query = {},
  { limitePorDefecto = 20, limiteMaximo = LIMITE_MAXIMO } = {}
) => {
  const pagina = parseEnteroPositivo(query.pagina, 1)
  const limiteSolicitado = parseEnteroPositivo(query.limite, limitePorDefecto)
  const limite = Math.min(limiteSolicitado, limiteMaximo)
  const offset = (pagina - 1) * limite

  return { pagina, limite, offset }
}

module.exports = { parsePaginacion, LIMITE_MAXIMO }

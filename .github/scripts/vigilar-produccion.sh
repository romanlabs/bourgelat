#!/usr/bin/env bash
# Comprueba desde fuera que producción responde. Falla (y GitHub avisa por correo)
# si la API o el sitio no contestan después de varios intentos.
set -u

API="${API_URL:-https://api.bourgelat.co}"
SITIO="${SITIO_URL:-https://bourgelat.co}"
APP="${APP_URL:-https://app.bourgelat.co}"
INTENTOS="${INTENTOS:-3}"
ESPERA="${ESPERA:-30}"

con_intentos() {
  local nombre="$1" funcion="$2" url="$3" i
  for ((i = 1; i <= INTENTOS; i++)); do
    if "$funcion" "$url"; then
      echo "OK    $nombre"
      return 0
    fi
    [ "$i" -lt "$INTENTOS" ] && sleep "$ESPERA"
  done
  echo "FALLA $nombre ($url)"
  return 1
}

# Debe confirmar que la base también responde.
api_sana() {
  curl -fsS -m 20 "$1/health" | grep -q '"database":"reachable"'
}

# Un 200 vacío también es una caída: así se vio /planes en blanco.
pagina_con_contenido() {
  [ "$(curl -fsS -m 20 "$1" | wc -c)" -gt 500 ]
}

fallas=0
con_intentos "API y base de datos" api_sana "$API" || fallas=1
con_intentos "Sitio público" pagina_con_contenido "$SITIO/" || fallas=1
con_intentos "Aplicación" pagina_con_contenido "$APP/" || fallas=1
exit "$fallas"

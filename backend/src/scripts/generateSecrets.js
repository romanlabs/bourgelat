const crypto = require('crypto')

const generarSecreto = () => crypto.randomBytes(48).toString('base64url')

console.log('Genera estos secretos y guardalos solo en tu panel de despliegue:\n')
console.log(`JWT_SECRET=${generarSecreto()}`)
console.log(`JWT_REFRESH_SECRET=${generarSecreto()}`)
console.log(`INTEGRACIONES_SECRET=${generarSecreto()}`)
console.log(`ENCRYPTION_KEYS=v1:${generarSecreto()}`)
console.log(`BLIND_INDEX_KEY=${generarSecreto()}`)
console.log(
  '\nENCRYPTION_KEYS y BLIND_INDEX_KEY protegen datos cifrados: guarda una copia en un'
)
console.log(
  'gestor de contrasenas del equipo (perderlas hace irrecuperable la PII cifrada).'
)
console.log(
  'Para rotar ENCRYPTION_KEYS agrega "v2:<clave-nueva>," AL FRENTE del valor actual'
)
console.log('y corre `npm run cifrado:rotar`; ver docs/secrets-rotation.md.')

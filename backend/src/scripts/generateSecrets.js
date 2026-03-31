const crypto = require('crypto')

const generarSecreto = () => crypto.randomBytes(48).toString('base64url')

console.log('Genera estos secretos y guardalos solo en tu panel de despliegue:\n')
console.log(`JWT_SECRET=${generarSecreto()}`)
console.log(`JWT_REFRESH_SECRET=${generarSecreto()}`)
console.log(`INTEGRACIONES_SECRET=${generarSecreto()}`)

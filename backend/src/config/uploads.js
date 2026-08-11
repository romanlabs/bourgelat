const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const UPLOADS_PUBLIC_PATH = '/uploads'
const UPLOADS_ROOT_DIR = path.resolve(__dirname, '..', '..', 'uploads')
const MASCOTAS_SUBDIR = 'mascotas'
const EXAMENES_SUBDIR = 'examenes'
const USUARIOS_SUBDIR = 'usuarios'
const PRODUCTOS_SUBDIR = 'productos'

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const ALLOWED_EXAMEN_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MIME_EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/jpeg': '.jpg',
}

const ensureDirectory = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true })
  }
}

const getMascotasUploadsDir = () => {
  const mascotasDir = path.join(UPLOADS_ROOT_DIR, MASCOTAS_SUBDIR)
  ensureDirectory(mascotasDir)
  return mascotasDir
}

const getExamenesUploadsDir = () => {
  const examenesDir = path.join(UPLOADS_ROOT_DIR, EXAMENES_SUBDIR)
  ensureDirectory(examenesDir)
  return examenesDir
}

const getUsuariosUploadsDir = () => {
  const usuariosDir = path.join(UPLOADS_ROOT_DIR, USUARIOS_SUBDIR)
  ensureDirectory(usuariosDir)
  return usuariosDir
}

const getProductosUploadsDir = () => {
  const productosDir = path.join(UPLOADS_ROOT_DIR, PRODUCTOS_SUBDIR)
  ensureDirectory(productosDir)
  return productosDir
}

const generateUploadFilename = (originalName = '', mimeType = '') => {
  const extension = MIME_EXTENSIONS[mimeType] || '.jpg'

  return `${Date.now()}-${crypto.randomUUID()}${extension}`
}

const buildPublicUploadUrl = (req, relativePath) => {
  const normalizedRelativePath = String(relativePath).split(path.sep).join('/')
  const explicitBaseUrl = (process.env.PUBLIC_UPLOADS_BASE_URL || '').trim().replace(/\/$/, '')

  if (explicitBaseUrl) {
    return `${explicitBaseUrl}/${normalizedRelativePath}`
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
  const protocol = forwardedProto || req.protocol || 'http'
  const host = req.get('host')

  return `${protocol}://${host}${UPLOADS_PUBLIC_PATH}/${normalizedRelativePath}`
}

module.exports = {
  UPLOADS_PUBLIC_PATH,
  UPLOADS_ROOT_DIR,
  MASCOTAS_SUBDIR,
  EXAMENES_SUBDIR,
  USUARIOS_SUBDIR,
  PRODUCTOS_SUBDIR,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_EXAMEN_MIME_TYPES,
  getMascotasUploadsDir,
  getExamenesUploadsDir,
  getUsuariosUploadsDir,
  getProductosUploadsDir,
  generateUploadFilename,
  buildPublicUploadUrl,
}

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const UPLOADS_PUBLIC_PATH = '/uploads'
const UPLOADS_ROOT_DIR = path.resolve(__dirname, '..', '..', 'uploads')
const MASCOTAS_SUBDIR = 'mascotas'

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

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

const generateUploadFilename = (originalName = '', mimeType = '') => {
  const extensionFromName = path.extname(originalName).toLowerCase()

  const extension =
    extensionFromName ||
    (mimeType === 'image/png'
      ? '.png'
      : mimeType === 'image/webp'
        ? '.webp'
        : '.jpg')

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
  ALLOWED_IMAGE_MIME_TYPES,
  getMascotasUploadsDir,
  generateUploadFilename,
  buildPublicUploadUrl,
}

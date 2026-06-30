import { api } from '@/api/client'

/**
 * Fichiers publics Laravel (ex. `profiles/…`) : **GET /api/storage/{path}**.
 */
function extractStorageRelativePathname(pathname: string): string | null {
  const p = pathname.split('?')[0]?.replace(/\/+$/, '') ?? ''
  let m = p.match(/\/api\/storage\/(.+)$/)
  if (m) return decodeURIComponent(m[1])
  m = p.match(/\/storage\/(.+)$/)
  if (m) return decodeURIComponent(m[1])
  return null
}

export function getStoragePublicUrl(path: string | null | undefined): string | null {
  if (path == null || path === '' || typeof path !== 'string') return null
  if (path.startsWith('data:') || path.startsWith('blob:')) return path

  const base = (api.defaults.baseURL || '').replace(/\/$/, '')
  if (!base) return null
  const apiRoot = base.endsWith('/api') ? base : `${base}/api`

  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const u = new URL(path)
      const rel = extractStorageRelativePathname(u.pathname)
      if (rel) {
        let url = `${apiRoot}/storage/${rel}`
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
          url = url.replace('http:', 'https:')
        }
        return url
      }
    } catch {
      return null
    }
    return path
  }

  const cleanedPath = path.replace(/^\/?(storage\/)?/, '')
  let url = `${apiRoot}/storage/${cleanedPath}`

  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
    url = url.replace('http:', 'https:')
  }
  return url
}

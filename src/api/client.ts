import axios from 'axios'

const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL
  const host = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1'
  return `http://${host}:8000`
}

export const api = axios.create({
  baseURL: getBaseURL(),
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers.Accept = 'application/json'
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export type DriverDailyStatsParams = {
  driverId: number
  from?: string
  to?: string
  tz?: string
}

export type DriverDailyStatsRow = {
  date: string
  total_rides: number
  completed_rides: number
  cancelled_rides: number
  gross_volume: number
  commission_total: number
  earnings_total: number
  currency: string
}

export type DriverDailyStatsResponse = {
  range: {
    from: string
    to: string
  }
  timezone: string
  driver_id: number
  data: DriverDailyStatsRow[]
}

export const getDriverDailyStats = async (
  params: DriverDailyStatsParams
): Promise<DriverDailyStatsResponse> => {
  const res = await api.get('/api/admin/stats/drivers/daily', {
    params: {
      driver_id: params.driverId,
      from: params.from,
      to: params.to,
      tz: params.tz,
    },
  })
  return res.data as DriverDailyStatsResponse
}

export type TopDriverDailyRow = {
  driver_id: number
  driver_name: string | null
  driver_phone: string | null
  completed_rides: number
  gross_volume: number
  commission_total: number
  earnings_total: number
  currency: string
}

export type TopDriversDailyEntry = {
  date: string
  top: TopDriverDailyRow[]
}

export type TopDriversDailyParams = {
  from?: string
  to?: string
  tz?: string
  limit?: number
}

export type TopDriversDailyResponse = {
  range: {
    from: string
    to: string
  }
  timezone: string
  limit: number
  data: TopDriversDailyEntry[]
}

export const getTopDriversDailyStats = async (
  params: TopDriversDailyParams = {}
): Promise<TopDriversDailyResponse> => {
  const res = await api.get('/api/admin/stats/drivers/daily/top', {
    params: {
      from: params.from,
      to: params.to,
      tz: params.tz,
      limit: params.limit,
    },
  })
  return res.data as TopDriversDailyResponse
}

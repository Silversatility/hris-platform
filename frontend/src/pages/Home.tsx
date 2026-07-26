import { useEffect, useState } from 'react'
import { apiClient } from '../lib/apiClient'

type ApiStatus = 'checking' | 'ok' | 'error'

function Home() {
  const [status, setStatus] = useState<ApiStatus>('checking')

  useEffect(() => {
    apiClient
      .get('/api/health/')
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main>
      <h1>HRIS Platform</h1>
      <p>
        Backend API status:{' '}
        {status === 'checking' && 'checking...'}
        {status === 'ok' && 'connected'}
        {status === 'error' && 'unreachable'}
      </p>
    </main>
  )
}

export default Home

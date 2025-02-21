import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegistering) {
        const { error } = await signUp(email, password)
        if (error) throw error
        setError('Controlla la tua email per verificare l\'account.')
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        navigate('/')
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isRegistering ? 'Registrazione' : 'Accesso'}</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Caricamento...' : (isRegistering ? 'Registrati' : 'Accedi')}
          </button>
        </form>
        <button 
          className="switch-auth-mode" 
          onClick={() => setIsRegistering(!isRegistering)}
        >
          {isRegistering 
            ? 'Hai già un account? Accedi' 
            : 'Non hai un account? Registrati'}
        </button>
      </div>
    </div>
  )
}

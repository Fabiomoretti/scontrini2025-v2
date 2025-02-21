import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export default function Dashboard() {
  const { supabase, session, signOut } = useAuth()
  const [image, setImage] = useState(null)
  const [centers, setCenters] = useState([])
  const [selectedCenter, setSelectedCenter] = useState('')
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewCenterForm, setShowNewCenterForm] = useState(false)
  const [newCenterName, setNewCenterName] = useState('')

  // ... resto del codice della dashboard (il vecchio contenuto di App.jsx) ...

  return (
    <div className="container">
      <div className="header">
        <h1>Gestione Spese</h1>
        <button onClick={signOut} className="logout-button">
          Logout
        </button>
      </div>
      
      {/* ... resto del JSX della dashboard ... */}
    </div>
  )
}

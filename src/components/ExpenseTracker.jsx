// Questo è il tuo componente principale esistente, rinominato
// Copia tutto il contenuto del vecchio App.jsx qui
// E aggiungi un pulsante di logout

import React from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function ExpenseTracker() {
  const { signOut } = useAuth()
  
  // ... tutto il codice esistente ...

  // Aggiungi questo nel return, ad esempio nell'header
  return (
    <div className="container">
      <div className="header">
        <h1>Gestione Spese</h1>
        <button onClick={signOut} className="logout-button">
          Logout
        </button>
      </div>
      
      {/* ... resto del codice esistente ... */}
    </div>
  )
}

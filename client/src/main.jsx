import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Provider יחיד מעניק לממשק כולו מצב התחברות משותף שמתעדכן בכל שינוי. */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)

import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { InboxView } from './components/InboxView'
import { EmailDetail } from './components/EmailDetail'
import { AccountSetup } from './components/AccountSetup'
import { ComposeEmail } from './components/ComposeEmail'
import { TriviaGame } from './components/TriviaGame'
import './index.css'

function AppContent() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<InboxView />} />
        <Route path="/email/:id" element={<EmailDetail />} />
        <Route path="/compose" element={<ComposeEmail />} />
        <Route path="/setup" element={<AccountSetup />} />
        <Route path="/game" element={<TriviaGame />} />
        <Route path="*" element={<InboxView />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App

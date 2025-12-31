import React from 'react'
import ReactDOM from 'react-dom/client'
import PetGame from './PetGame'
import './index.css'

// App Wrapper mit Handy-Frame für Desktop
const AppWrapper = () => {
  return (
    <div className="app-frame">
      <div className="app-frame-inner">
        <PetGame />
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
)

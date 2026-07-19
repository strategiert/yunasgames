import React from 'react'
import ReactDOM from 'react-dom/client'
import PetGame from './PetGame'
import './index.css'

// Übernimmt ein neuer Service Worker (skipWaiting) die laufende Seite, sofort
// neu laden: Die alte Seite fragt sonst Assets an, deren Cache gerade
// aufgeräumt wurde und die es am Server nicht mehr gibt → kaputte Bilder.
if ('serviceWorker' in navigator) {
  let hadController = !!navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.location.reload()
    hadController = true
  })
}

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

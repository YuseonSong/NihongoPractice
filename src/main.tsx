import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { offlineSupport } from './pwa/client'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
void offlineSupport.prepare()

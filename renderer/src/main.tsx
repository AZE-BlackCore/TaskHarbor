import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 检查 Electron API 是否可用
console.log('=== Electron API Check ===')
console.log('window.electronAPI:', window.electronAPI)
console.log('Has electronAPI:', 'electronAPI' in window)
console.log('========================')

createRoot(document.getElementById('root')!).render(
  <App />
)

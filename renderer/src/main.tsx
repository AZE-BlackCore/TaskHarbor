import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 检查 Electron API 是否可用
console.log('=== Electron API Check ===')
console.log('window.electronAPI:', window.electronAPI)
console.log('Has electronAPI:', 'electronAPI' in window)
console.log('========================')

// 动态设置 favicon（确保在 Electron 中正确显示）
function setFavicon() {
  const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
  if (link) {
    link.href = '/app-logo.svg';
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'icon';
    newLink.type = 'image/svg+xml';
    newLink.href = '/app-logo.svg';
    document.head.appendChild(newLink);
  }
  console.log('Favicon set to app-logo.svg');
}

// 等待 DOM 加载完成后设置 favicon
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setFavicon);
} else {
  setFavicon();
}

createRoot(document.getElementById('root')!).render(
  <App />
)

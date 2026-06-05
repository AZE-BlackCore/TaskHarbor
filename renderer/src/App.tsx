import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { TagMain } from './views/tag/TagMain'
import { ScheduleView } from './views/ScheduleView'
import { FloatingWindow } from './views/FloatingWindow'
import { DesktopCard } from './views/DesktopCard'
import { TaskReminder } from './components/notification/TaskReminder'

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode(!darkMode)

  return (
    <HashRouter>
      <Routes>
        {/* 主窗口路由 */}
        <Route path="/" element={<Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
          <Route index element={<Navigate to="/tags" replace />} />
          <Route path="tags" element={<TagMain />} />
          <Route path="schedule" element={<ScheduleView />} />
          {/* 旧路由兼容重定向 */}
          <Route path="list" element={<Navigate to="/tags" replace />} />
          <Route path="gantt" element={<Navigate to="/tags" replace />} />
          <Route path="kanban" element={<Navigate to="/tags" replace />} />
          <Route path="calendar" element={<Navigate to="/tags" replace />} />
          <Route path="dashboard" element={<Navigate to="/tags" replace />} />
          <Route path="projects" element={<Navigate to="/tags" replace />} />
        </Route>
        
        {/* 悬浮窗口路由 */}
        <Route path="/floating" element={<FloatingWindow />} />
        
        {/* 桌面卡片路由 */}
        <Route path="/desktop-card" element={<DesktopCard />} />
      </Routes>
      
      {/* 任务提醒 */}
      <TaskReminder />
    </HashRouter>
  )
}

export default App

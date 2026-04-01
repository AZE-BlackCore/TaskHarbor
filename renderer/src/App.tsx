import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ListView } from './views/ListView'
import { GanttView } from './views/GanttView'
import { KanbanView } from './views/KanbanView'
import { CalendarView } from './views/CalendarView'
import { DashboardView } from './views/DashboardView'
import { ProjectView } from './views/ProjectView'
import { ScheduleView } from './views/ScheduleView'
import { FloatingWindow } from './views/FloatingWindow'
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
    <BrowserRouter>
      <Routes>
        {/* 主窗口路由 */}
        <Route path="/" element={<Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
          <Route index element={<Navigate to="/list" replace />} />
          <Route path="list" element={<ListView />} />
          <Route path="projects" element={<ProjectView />} />
          <Route path="gantt" element={<GanttView />} />
          <Route path="kanban" element={<KanbanView />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="schedule" element={<ScheduleView />} />
          <Route path="dashboard" element={<DashboardView />} />
        </Route>
        
        {/* 悬浮窗口路由 */}
        <Route path="/floating" element={<FloatingWindow />} />
      </Routes>
      
      {/* 任务提醒 */}
      <TaskReminder />
    </BrowserRouter>
  )
}

export default App

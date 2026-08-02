import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DayTodoView } from './views/DayTodoView'
import { RecentView } from './views/RecentView'
import { ScheduleView } from './views/ScheduleView'
import { InboxView } from './views/InboxView'
import { StatsView } from './views/StatsView'
import { TagList } from './views/tag/TagList'
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
    <HashRouter>
      <Routes>
        {/* Main window routes */}
        <Route path="/" element={<Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
          <Route index element={<Navigate to="/day-todo" replace />} />
          <Route path="day-todo" element={<DayTodoView darkMode={darkMode} />} />
          <Route path="recent" element={<RecentView />} />
          <Route path="schedule" element={<ScheduleView />} />
          <Route path="inbox" element={<InboxView />} />
          <Route path="review" element={<StatsView />} />
          <Route path="tags" element={<TagList />} />
          {/* Old route compatibility redirects */}
          <Route path="list" element={<Navigate to="/recent" replace />} />
          <Route path="gantt" element={<Navigate to="/day-todo" replace />} />
          <Route path="kanban" element={<Navigate to="/day-todo" replace />} />
          <Route path="calendar" element={<Navigate to="/day-todo" replace />} />
          <Route path="dashboard" element={<Navigate to="/review" replace />} />
          <Route path="projects" element={<Navigate to="/day-todo" replace />} />
          <Route path="stats" element={<Navigate to="/review" replace />} />
        </Route>

        {/* Floating window route */}
        <Route path="/floating" element={<FloatingWindow />} />
      </Routes>

      {/* Task reminder */}
      <TaskReminder />
    </HashRouter>
  )
}

export default App

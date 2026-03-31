import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export function CalendarView() {
  const { tasks, fetchTasks } = useTaskStore();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getDaysInMonth = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day(); // 0-6 (周日 - 周六)
    const daysInMonth = currentMonth.daysInMonth();
    
    const days: Array<{ date: Dayjs; isCurrentMonth: boolean; isToday: boolean }> = [];
    
    // 添加上个月的日期
    for (let i = startDay - 1; i >= 0; i--) {
      const date = startOfMonth.subtract(i + 1, 'day');
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.isSame(dayjs(), 'day'),
      });
    }
    
    // 添加当月的日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = currentMonth.date(i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.isSame(dayjs(), 'day'),
      });
    }
    
    // 添加下个月的日期
    const remaining = 42 - days.length; // 6 行 x 7 天 = 42
    for (let i = 1; i <= remaining; i++) {
      const date = endOfMonth.add(i, 'day');
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.isSame(dayjs(), 'day'),
      });
    }
    
    return days;
  };

  const getTasksForDate = (date: Dayjs) => {
    return tasks.filter(task => {
      if (!task.startDate && !task.estimatedEndDate) return false;
      
      const taskStart = task.startDate ? dayjs(task.startDate) : null;
      const taskEnd = task.estimatedEndDate ? dayjs(task.estimatedEndDate) : null;
      
      if (taskStart && taskEnd) {
        return date.isSameOrAfter(taskStart, 'day') && date.isSameOrBefore(taskEnd, 'day');
      }
      
      if (taskStart) {
        return date.isSame(taskStart, 'day');
      }
      
      if (taskEnd) {
        return date.isSame(taskEnd, 'day');
      }
      
      return false;
    });
  };

  const getTaskColor = (taskId: string) => {
    // 简单根据任务 ID 生成颜色
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
    const index = taskId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const days = getDaysInMonth();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonth(currentMonth.subtract(1, 'month'));
    } else if (viewMode === 'week') {
      setCurrentMonth(currentMonth.subtract(1, 'week'));
    } else {
      setCurrentMonth(currentMonth.subtract(1, 'day'));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonth(currentMonth.add(1, 'month'));
    } else if (viewMode === 'week') {
      setCurrentMonth(currentMonth.add(1, 'week'));
    } else {
      setCurrentMonth(currentMonth.add(1, 'day'));
    }
  };

  const handleToday = () => {
    setCurrentMonth(dayjs());
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-card">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6" />
            日历视图
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-600"
            >
              今天
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'month' 
                    ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                月
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'week' 
                    ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                周
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === 'day' 
                    ? 'bg-white dark:bg-dark-card shadow text-gray-900 dark:text-white' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                日
              </button>
            </div>
          </div>
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {currentMonth.format('YYYY 年 MM 月')}
        </div>
      </div>

      {/* 日历网格 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {/* 星期标题 */}
          {weekDays.map(day => (
            <div
              key={day}
              className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {day}
            </div>
          ))}

          {/* 日期网格 */}
          {days.map((day, index) => {
            const dayTasks = getTasksForDate(day.date);
            
            return (
              <div
                key={index}
                className={`min-h-[100px] bg-white dark:bg-dark-card p-2 ${
                  !day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                }`}
              >
                <div className={`text-sm mb-1 ${
                  day.isToday 
                    ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center' 
                    : day.isCurrentMonth
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-600'
                }`}>
                  {day.date.date()}
                </div>
                
                {/* 任务标记 */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <div
                      key={task.id}
                      className="text-xs p-1 rounded truncate text-white"
                      style={{ backgroundColor: getTaskColor(task.id) }}
                      title={task.description}
                    >
                      {task.description}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{dayTasks.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部图例 */}
      <div className="flex-shrink-0 p-3 border-t border-light-border dark:border-dark-border bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">任务总数:</span>
          <span className="font-medium text-gray-900 dark:text-white">{tasks.length}</span>
          <div className="flex-1" />
          <span className="text-gray-600 dark:text-gray-400">本月任务:</span>
          <span className="font-medium text-primary">
            {tasks.filter(task => {
              const taskDate = task.startDate ? dayjs(task.startDate) : task.estimatedEndDate ? dayjs(task.estimatedEndDate) : null;
              return taskDate && taskDate.isSame(currentMonth, 'month');
            }).length}
          </span>
        </div>
      </div>
    </div>
  );
}

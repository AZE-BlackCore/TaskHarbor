import { useEffect, useState } from 'react';
import { useScheduleStore } from '../stores/scheduleStore';
import { Calendar, Clock, MapPin, Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import type { Schedule } from '../types';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

export function ScheduleView() {
  const { schedules, fetchSchedules, createSchedule, updateSchedule, deleteSchedule } = useScheduleStore();
  const [currentMonth, setCurrentMonth] = useState(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const [newSchedule, setNewSchedule] = useState({
    title: '',
    description: '',
    location: '',
    startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
    endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    allDay: false,
    color: '#3B82F6',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getDaysInMonth = () => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = currentMonth.daysInMonth();
    
    const days: Array<{ date: Dayjs; isCurrentMonth: boolean; isToday: boolean }> = [];
    
    for (let i = startDay - 1; i >= 0; i--) {
      const date = startOfMonth.subtract(i + 1, 'day');
      days.push({ date, isCurrentMonth: false, isToday: date.isSame(dayjs(), 'day') });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = currentMonth.date(i);
      days.push({ date, isCurrentMonth: true, isToday: date.isSame(dayjs(), 'day') });
    }
    
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = endOfMonth.add(i, 'day');
      days.push({ date, isCurrentMonth: false, isToday: date.isSame(dayjs(), 'day') });
    }
    
    return days;
  };

  const getSchedulesForDate = (date: Dayjs) => {
    let filtered = schedules.filter(schedule => {
      const scheduleStart = dayjs(schedule.startTime);
      const scheduleEnd = dayjs(schedule.endTime);
      return date.isSameOrAfter(scheduleStart, 'day') && date.isSameOrBefore(scheduleEnd, 'day');
    });

    if (filterPriority !== 'all') {
      filtered = filtered.filter(s => s.priority === filterPriority);
    }

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'low': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

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
    setSelectedDate(dayjs());
  };

  const handleDateClick = (date: Dayjs) => {
    setSelectedDate(date);
    if (viewMode === 'month') {
      setViewMode('day');
    }
  };

  const handleCreateSchedule = async () => {
    if (!newSchedule.title.trim()) return;

    const scheduleData = {
      ...newSchedule,
      startTime: new Date(newSchedule.startTime).toISOString(),
      endTime: new Date(newSchedule.endTime).toISOString(),
    };

    const created = await createSchedule(scheduleData);
    if (created) {
      setShowCreateDialog(false);
      setNewSchedule({
        title: '',
        description: '',
        location: '',
        startTime: dayjs().format('YYYY-MM-DDTHH:mm'),
        endTime: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
        allDay: false,
        color: '#3B82F6',
        priority: 'medium',
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('确定要删除这个日程吗？')) {
      await deleteSchedule(id);
    }
  };

  const days = getDaysInMonth();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const filteredSchedules = getSchedulesForDate(selectedDate);

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* 顶部工具栏 */}
      <div className="p-4 border-b border-light-border dark:border-dark-border bg-white dark:bg-dark-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentMonth.format('YYYY 年')} {monthNames[currentMonth.month()]}
            </h1>
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={handleToday} className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary-600 transition-colors">
                今天
              </button>
              <button onClick={handleNext} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded p-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'month' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                月
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  viewMode === 'day' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                日
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索日程..."
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={filterPriority}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all' || value === 'low' || value === 'medium' || value === 'high') {
                  setFilterPriority(value);
                }
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>

            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>新建日程</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 日历视图 */}
        <div className="flex-1 p-4 overflow-auto">
          {viewMode === 'month' && (
            <div className="h-full">
              <div className="grid grid-cols-7 mb-2">
                {weekDays.map((day, index) => (
                  <div key={index} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 h-[calc(100%-2rem)]">
                {days.map((day, index) => {
                  const daySchedules = getSchedulesForDate(day.date);
                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day.date)}
                      className={`border border-gray-200 dark:border-gray-700 p-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        !day.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 opacity-50' : ''
                      } ${day.isToday ? 'ring-2 ring-primary' : ''} ${
                        selectedDate?.isSame(day.date, 'day') ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          day.isToday 
                            ? 'w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white' 
                            : day.isCurrentMonth 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {day.date.date()}
                        </span>
                        {daySchedules.length > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">{daySchedules.length}</span>
                        )}
                      </div>
                      
                      <div className="space-y-1 overflow-y-auto max-h-[calc((100vh-200px)/6)]">
                        {daySchedules.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            className="text-xs px-2 py-1 rounded truncate text-white"
                            style={{ backgroundColor: schedule.color }}
                          >
                            {schedule.title}
                          </div>
                        ))}
                        {daySchedules.length > 3 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 pl-2">
                            +{daySchedules.length - 3} 更多
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="h-full overflow-auto">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedDate.format('YYYY 年 MM 月 DD 日')}
                </h2>
              </div>
              
              <div className="space-y-3">
                {filteredSchedules.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">这一天还没有日程</p>
                    <button
                      onClick={() => setShowCreateDialog(true)}
                      className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-600"
                    >
                      添加第一个日程
                    </button>
                  </div>
                ) : (
                  filteredSchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{schedule.title}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(schedule.priority)}`}>
                              {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{dayjs(schedule.startTime).format('HH:mm')} - {dayjs(schedule.endTime).format('HH:mm')}</span>
                              {schedule.allDay && <span className="text-xs">(全天)</span>}
                            </div>
                            {schedule.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{schedule.location}</span>
                              </div>
                            )}
                            {schedule.description && <p className="mt-2 text-gray-700 dark:text-gray-300">{schedule.description}</p>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedSchedule(schedule); setShowEditDialog(true); }}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧日程列表 */}
        <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto bg-white dark:bg-dark-card">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {selectedDate.format('MM 月 DD 日')} 日程
          </h3>
          
          <div className="space-y-2">
            {filteredSchedules.map((schedule) => (
              <div
                key={schedule.id}
                className="p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow"
                style={{ borderLeftColor: schedule.color }}
                onClick={() => { setSelectedSchedule(schedule); setShowEditDialog(true); }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">{schedule.title}</h4>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(schedule.priority)}`}>
                    {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {dayjs(schedule.startTime).format('HH:mm')} - {dayjs(schedule.endTime).format('HH:mm')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 新建日程对话框 */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">新建日程</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
                <input
                  type="text"
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="输入日程标题..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
                <textarea
                  value={newSchedule.description}
                  onChange={(e) => setNewSchedule({ ...newSchedule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="日程描述..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">开始时间</label>
                  <input
                    type="datetime-local"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">结束时间</label>
                  <input
                    type="datetime-local"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">地点</label>
                <input
                  type="text"
                  value={newSchedule.location}
                  onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="会议地点、地址等"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">优先级</label>
                  <select
                    value={newSchedule.priority}
                    onChange={(e) => setNewSchedule({ ...newSchedule, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">颜色</label>
                  <input
                    type="color"
                    value={newSchedule.color}
                    onChange={(e) => setNewSchedule({ ...newSchedule, color: e.target.value })}
                    className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={newSchedule.allDay}
                  onChange={(e) => setNewSchedule({ ...newSchedule, allDay: e.target.checked })}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <label htmlFor="allDay" className="text-sm text-gray-700 dark:text-gray-300">全天事件</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                取消
              </button>
              <button
                onClick={handleCreateSchedule}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑日程对话框 */}
      {showEditDialog && selectedSchedule && (
        <EditScheduleDialog
          schedule={selectedSchedule}
          onClose={() => { setShowEditDialog(false); setSelectedSchedule(null); }}
          onSave={async (updates) => {
            await updateSchedule(selectedSchedule.id, updates);
            setShowEditDialog(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </div>
  );
}

interface EditScheduleDialogProps {
  schedule: Schedule;
  onClose: () => void;
  onSave: (updates: Partial<Schedule>) => void;
}

function EditScheduleDialog({ schedule, onClose, onSave }: EditScheduleDialogProps) {
  const [formData, setFormData] = useState({
    title: schedule.title,
    description: schedule.description || '',
    location: schedule.location || '',
    startTime: dayjs(schedule.startTime).format('YYYY-MM-DDTHH:mm'),
    endTime: dayjs(schedule.endTime).format('YYYY-MM-DDTHH:mm'),
    allDay: schedule.allDay,
    color: schedule.color,
    priority: schedule.priority,
  });

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave({
      ...formData,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-lg p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">编辑日程</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入日程标题..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="日程描述..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">开始时间</label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">结束时间</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">地点</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="会议地点、地址等"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">优先级</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">颜色</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editAllDay"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            />
            <label htmlFor="editAllDay" className="text-sm text-gray-700 dark:text-gray-300">全天事件</label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-600"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

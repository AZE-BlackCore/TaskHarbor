import { useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useScheduleStore } from '../stores/scheduleStore';
import { Calendar, Clock, MapPin, Plus, ChevronLeft, ChevronRight, MoreVertical, Search, Filter, Pencil, Trash2 } from 'lucide-react';
import type { Schedule } from '../types';

export function ScheduleView() {
  const { schedules, fetchSchedules, createSchedule, deleteSchedule, updateSchedule } = useScheduleStore();
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [showMonthView, setShowMonthView] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

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
    return schedules.filter(schedule => {
      const scheduleDate = dayjs(schedule.startTime);
      return scheduleDate.isSame(date, 'day');
    }).filter(s => {
      if (!searchTerm) return true;
      return s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             s.location?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const handlePrevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'));
  const handleToday = () => {
    const today = dayjs();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const handleDateClick = (date: Dayjs) => {
    setSelectedDate(date);
    setShowMonthView(false);
  };

  const days = getDaysInMonth();
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const filteredSchedules = getSchedulesForDate(selectedDate);

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个日程吗？')) {
      await deleteSchedule(id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {currentMonth.format('YYYY年')} {monthNames[currentMonth.month()]}
            </div>

            <button
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              今天
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索日程..."
                className="pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowMonthView(!showMonthView)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {showMonthView ? '日视图' : '月视图'}
            </button>

            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">新建日程</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {showMonthView ? (
          // Month Calendar View
          <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {weekDays.map((day, index) => (
                <div key={index} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 py-3">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const daySchedules = getSchedulesForDate(day.date);
                const isSelected = selectedDate.isSame(day.date, 'day');
                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day.date)}
                    className={`min-h-[100px] p-2 border-r border-b border-gray-100 dark:border-gray-800 cursor-pointer transition-colors ${
                      !day.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/30' : ''
                    } ${isSelected ? 'bg-teal-50 dark:bg-teal-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        day.isToday ? 'w-6 h-6 flex items-center justify-center rounded-full bg-teal-500 text-white' :
                        day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {day.date.date()}
                      </span>
                      {daySchedules.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{daySchedules.length}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {daySchedules.slice(0, 2).map((schedule) => (
                        <div
                          key={schedule.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: schedule.color }}
                        >
                          {schedule.title}
                        </div>
                      ))}
                      {daySchedules.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                          +{daySchedules.length - 2} 更多
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // Day View
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedDate.format('YYYY年MM月DD日')}
              </h2>
              {selectedDate.isSame(dayjs(), 'day') && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400">
                  今天
                </span>
              )}
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">这一天还没有日程</p>
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
                >
                  添加第一个日程
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSchedules.map((schedule) => (
                  <ScheduleItem
                    key={schedule.id}
                    schedule={schedule}
                    onDelete={handleDelete}
                    onEdit={(s) => setEditingSchedule(s)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Schedule Dialog */}
      {showCreateDialog && (
        <ScheduleDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={createSchedule}
          defaultDate={selectedDate}
        />
      )}
      {editingSchedule && (
        <ScheduleDialog
          onClose={() => setEditingSchedule(null)}
          onCreate={createSchedule}
          onUpdate={updateSchedule}
          defaultDate={selectedDate}
          schedule={editingSchedule}
        />
      )}
    </div>
  );
}

function ScheduleItem({ schedule, onDelete, onEdit }: { schedule: Schedule; onDelete: (id: string) => void; onEdit: (s: Schedule) => void }) {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-12 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: schedule.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {schedule.title}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(schedule)}
                className="p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-900/20 text-gray-400 hover:text-teal-500 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(schedule.id)}
                className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {dayjs(schedule.startTime).format('HH:mm')} - {dayjs(schedule.endTime).format('HH:mm')}
            </span>
            {schedule.allDay && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                全天
              </span>
            )}
            {schedule.priority && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                schedule.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                schedule.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
                {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
              </span>
            )}
          </div>
          {schedule.location && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <MapPin className="w-3 h-3" />
              {schedule.location}
            </div>
          )}
          {schedule.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{schedule.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleDialog({ onClose, onCreate, onUpdate, defaultDate, schedule }: {
  onClose: () => void;
  onCreate: (data: Partial<Schedule>) => Promise<Schedule | null>;
  onUpdate?: (id: string, updates: Partial<Schedule>) => void;
  defaultDate: Dayjs;
  schedule?: Schedule | null;
}) {
  const isEdit = !!schedule;
  const [title, setTitle] = useState(schedule?.title || '');
  const [description, setDescription] = useState(schedule?.description || '');
  const [location, setLocation] = useState(schedule?.location || '');
  const [startTime, setStartTime] = useState(
    schedule ? dayjs(schedule.startTime).format('YYYY-MM-DDTHH:mm') : defaultDate.hour(9).minute(0).format('YYYY-MM-DDTHH:mm')
  );
  const [endTime, setEndTime] = useState(
    schedule ? dayjs(schedule.endTime).format('YYYY-MM-DDTHH:mm') : defaultDate.hour(10).minute(0).format('YYYY-MM-DDTHH:mm')
  );
  const [allDay, setAllDay] = useState(schedule?.allDay ?? false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(schedule?.priority || 'medium');
  const [color, setColor] = useState(schedule?.color || '#3B82F6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        description,
        location,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        allDay,
        priority,
        color,
      };

      if (isEdit && schedule && onUpdate) {
        await onUpdate(schedule.id, data);
      } else {
        await onCreate(data);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{isEdit ? '编辑日程' : '新建日程'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="输入日程标题..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="日程描述..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">开始时间</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">结束时间</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">地点</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="会议地点、地址等"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">优先级</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full h-10 px-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg cursor-pointer"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-teal-500 focus:ring-teal-500"
            />
            <label htmlFor="allDay" className="text-sm text-gray-700 dark:text-gray-300">全天事件</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存' : '创建')}
          </button>
        </div>
      </div>
    </div>
  );
}

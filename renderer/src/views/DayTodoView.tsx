import React, { useState, useEffect, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useScheduleStore } from '../stores/scheduleStore';
import { ChevronLeft, ChevronRight, MoreVertical, Sun, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Schedule } from '../types';

interface DayTodoViewProps {
  darkMode: boolean;
}

export function DayTodoView({ darkMode }: DayTodoViewProps) {
  const { schedules, fetchSchedules, createSchedule, deleteSchedule, updateSchedule } = useScheduleStore();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [weekDates, setWeekDates] = useState<Dayjs[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    // Generate week dates (showing a window around today)
    const today = dayjs();
    const startOfWeek = today.subtract(3, 'day');
    const dates: Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(startOfWeek.add(i, 'day'));
    }
    setWeekDates(dates);
  }, []);

  const goToPrevWeek = () => {
    const newDates = weekDates.map(d => d.subtract(7, 'day'));
    setWeekDates(newDates);
    setSelectedDate(newDates.find(d => d.isSame(dayjs(), 'day')) || newDates[3]);
  };

  const goToNextWeek = () => {
    const newDates = weekDates.map(d => d.add(7, 'day'));
    setWeekDates(newDates);
    setSelectedDate(newDates.find(d => d.isSame(dayjs(), 'day')) || newDates[3]);
  };

  const goToToday = () => {
    const today = dayjs();
    const startOfWeek = today.subtract(3, 'day');
    const dates: Dayjs[] = [];
    for (let i = 0; i < 7; i++) {
      dates.push(startOfWeek.add(i, 'day'));
    }
    setWeekDates(dates);
    setSelectedDate(today);
  };

  const getSchedulesForDate = (date: Dayjs) => {
    return schedules.filter(s => {
      const scheduleDate = dayjs(s.startTime);
      return scheduleDate.isSame(date, 'day');
    });
  };

  const handleCreateQuick = async () => {
    if (!newTitle.trim()) return;

    setLoading(true);
    try {
      const scheduleData = {
        title: newTitle.trim(),
        startTime: selectedDate.hour(9).minute(0).second(0).toISOString(),
        endTime: selectedDate.hour(10).minute(0).second(0).toISOString(),
        allDay: false,
        color: '#3B82F6',
        priority: 'medium' as const,
      };

      const result = await createSchedule(scheduleData);
      if (result) {
        setNewTitle('');
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateQuick();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个日程吗？')) {
      await deleteSchedule(id);
    }
  };

  const todaySchedules = getSchedulesForDate(selectedDate);
  const isToday = selectedDate.isSame(dayjs(), 'day');

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Top date navigation bar */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          {/* Prev button */}
          <button
            onClick={goToPrevWeek}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Date scroll */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max px-2">
              {weekDates.map((date, index) => {
                const dayNum = date.format('D');
                const isSelected = date.isSame(selectedDate, 'day');
                const isTodayDate = date.isSame(dayjs(), 'day');
                const hasSchedules = getSchedulesForDate(date).length > 0;

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`relative flex flex-col items-center justify-center w-12 h-14 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-xs font-medium opacity-70">
                      {date.format('ddd').substring(1)}
                    </span>
                    <span className="text-lg font-bold">{dayNum}</span>
                    {isTodayDate && !isSelected && (
                      <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-teal-500" />
                    )}
                    {hasSchedules && (
                      <span className={`absolute -top-0.5 right-1 w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-teal-500'
                      }`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={goToNextWeek}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Today label */}
          <div className="ml-2 text-lg font-semibold text-gray-900 dark:text-white min-w-[100px]">
            {selectedDate.format('M月D日')}
            {isToday && <span className="ml-1 text-teal-500">今天</span>}
          </div>

          {/* Theme toggle */}
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={darkMode ? '浅色模式' : '深色模式'}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick add input */}
        <div className="relative">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此添加内容，按回车创建事件"
            className="w-full px-4 py-3 pr-12 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
            title="更多选项"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {todaySchedules.length > 0 ? (
          <div className="space-y-3">
            {todaySchedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onEdit={(s) => setEditingSchedule(s)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            {/* Empty state illustration */}
            <div className="relative w-64 h-64 mb-6">
              {/* Background circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20" />
              
              {/* Illustration elements */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 200"
                  className="w-48 h-48"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Sun */}
                  <circle cx="140" cy="60" r="30" fill="#FFD93D" />
                  <circle cx="140" cy="60" r="25" fill="#FFE66D" />
                  
                  {/* Person body */}
                  <ellipse cx="70" cy="140" rx="25" ry="10" fill="#64748B" opacity="0.3" />
                  
                  {/* Person */}
                  <circle cx="70" cy="90" r="20" fill="#CBD5E1" />
                  <rect x="55" y="105" width="30" height="35" rx="8" fill="#94A3B8" />
                  <rect x="50" y="140" width="10" height="25" rx="3" fill="#64748B" />
                  <rect x="80" y="140" width="10" height="25" rx="3" fill="#64748B" />
                  <rect x="35" y="115" width="15" height="8" rx="4" fill="#E2E8F0" transform="rotate(-30 35 115)" />
                  <rect x="90" y="115" width="15" height="8" rx="4" fill="#E2E8F0" transform="rotate(30 90 115)" />
                  
                  {/* Calendar icon */}
                  <rect x="110" y="100" width="40" height="35" rx="4" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
                  <rect x="115" y="95" width="30" height="8" rx="2" fill="#94A3B8" />
                  <line x1="115" y1="115" x2="145" y2="115" stroke="#E2E8F0" strokeWidth="2" />
                  <line x1="115" y1="125" x2="135" y2="125" stroke="#E2E8F0" strokeWidth="2" />
                  
                  {/* Dots */}
                  <circle cx="30" cy="50" r="3" fill="#E2E8F0" />
                  <circle cx="40" cy="40" r="2" fill="#CBD5E1" />
                  <circle cx="25" cy="60" r="2" fill="#CBD5E1" />
                </svg>
              </div>
            </div>
            
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">暂无日程</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              在上方输入框添加今天的计划
            </p>
          </div>
        )}
      </div>

      {/* Edit Schedule Dialog */}
      {editingSchedule && (
        <EditScheduleDialog
          schedule={editingSchedule}
          onClose={() => setEditingSchedule(null)}
          onUpdate={updateSchedule}
        />
      )}
    </div>
  );
}

function ScheduleCard({ schedule, onEdit, onDelete }: { schedule: Schedule; onEdit: (s: Schedule) => void; onDelete: (id: string) => void }) {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card hover:shadow-md transition-shadow group">
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
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <span>
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
          {schedule.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {schedule.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditScheduleDialog({ schedule, onClose, onUpdate }: {
  schedule: Schedule;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Schedule>) => void;
}) {
  const [title, setTitle] = useState(schedule.title);
  const [description, setDescription] = useState(schedule.description || '');
  const [location, setLocation] = useState(schedule.location || '');
  const [startTime, setStartTime] = useState(dayjs(schedule.startTime).format('YYYY-MM-DDTHH:mm'));
  const [endTime, setEndTime] = useState(dayjs(schedule.endTime).format('YYYY-MM-DDTHH:mm'));
  const [allDay, setAllDay] = useState(schedule.allDay ?? false);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(schedule.priority || 'medium');
  const [color, setColor] = useState(schedule.color || '#3B82F6');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await onUpdate(schedule.id, {
        title: title.trim(),
        description,
        location,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        allDay,
        priority,
        color,
      });
      onClose();
    } catch (error) {
      console.error('Failed to update schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">编辑日程</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
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
              id="editAllDay"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-teal-500 focus:ring-teal-500"
            />
            <label htmlFor="editAllDay" className="text-sm text-gray-700 dark:text-gray-300">全天事件</label>
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
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

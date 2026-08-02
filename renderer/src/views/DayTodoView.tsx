import React, { useState, useEffect, useRef } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useScheduleStore } from '../stores/scheduleStore';
import { ChevronLeft, ChevronRight, MoreVertical, Sun, Plus } from 'lucide-react';
import type { Schedule } from '../types';

interface DayTodoViewProps {
  darkMode: boolean;
}

export function DayTodoView({ darkMode }: DayTodoViewProps) {
  const { schedules, fetchSchedules, createSchedule } = useScheduleStore();
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [weekDates, setWeekDates] = useState<Dayjs[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
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
              <ScheduleCard key={schedule.id} schedule={schedule} />
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
    </div>
  );
}

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-dark-card hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className="w-1 h-12 rounded-full flex-shrink-0 mt-1"
          style={{ backgroundColor: schedule.color }}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {schedule.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {dayjs(schedule.startTime).format('HH:mm')} - {dayjs(schedule.endTime).format('HH:mm')}
            </span>
            {schedule.allDay && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                全天
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

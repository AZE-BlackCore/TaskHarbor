import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import { useProjectStore } from '../stores/projectStore';
import type { Task } from '../types';
import { ZoomIn, ZoomOut, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

// 启用 weekOfYear 插件
dayjs.extend(weekOfYear);

export function GanttView() {
  const { tasks, fetchTasks } = useTaskStore();
  const { projects, fetchProjects } = useProjectStore();
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(dayjs());

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, [fetchTasks, fetchProjects]);

  const getProjectColor = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.color || '#3B82F6';
  };

  const handleZoomIn = () => {
    if (zoomLevel === 'month') setZoomLevel('week');
    if (zoomLevel === 'week') setZoomLevel('day');
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'day') setZoomLevel('week');
    if (zoomLevel === 'week') setZoomLevel('month');
  };

  const handlePrev = () => {
    if (zoomLevel === 'day') {
      setCurrentDate(currentDate.subtract(7, 'day'));
    } else if (zoomLevel === 'week') {
      setCurrentDate(currentDate.subtract(1, 'month'));
    } else {
      setCurrentDate(currentDate.subtract(3, 'month'));
    }
  };

  const handleNext = () => {
    if (zoomLevel === 'day') {
      setCurrentDate(currentDate.add(7, 'day'));
    } else if (zoomLevel === 'week') {
      setCurrentDate(currentDate.add(1, 'month'));
    } else {
      setCurrentDate(currentDate.add(3, 'month'));
    }
  };

  // 生成时间轴
  const generateTimeline = () => {
    const days = [];
    const startDate = currentDate.startOf(zoomLevel === 'day' ? 'week' : zoomLevel === 'week' ? 'month' : 'year');
    const endDate = startDate.add(zoomLevel === 'day' ? 14 : zoomLevel === 'week' ? 6 : 12, zoomLevel === 'day' ? 'day' : zoomLevel === 'week' ? 'week' : 'month');
    
    let current = startDate;
    while (current.isBefore(endDate)) {
      days.push(current.clone());
      current = current.add(1, zoomLevel === 'day' ? 'day' : zoomLevel === 'week' ? 'week' : 'month');
    }
    
    return days;
  };

  const timeline = generateTimeline();

  // 计算任务在甘特图中的位置
  const getTaskPosition = (task: Task) => {
    const start = task.startDate ? dayjs(task.startDate) : dayjs();
    const end = task.estimatedEndDate ? dayjs(task.estimatedEndDate) : start.add(7, 'day');
    const timelineStart = timeline[0];
    const timelineEnd = timeline[timeline.length - 1];
    
    if (end.isBefore(timelineStart) || start.isAfter(timelineEnd)) {
      return null;
    }
    
    const totalDays = timelineStart.diff(timelineEnd, 'day');
    const startOffset = start.diff(timelineStart, 'day');
    const duration = end.diff(start, 'day') || 1;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-card">
      {/* 顶部工具栏 */}
      <div className="flex-shrink-0 p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            甘特图视图
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="上一个时间段"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(dayjs())}
              className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-600"
            >
              今天
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="下一个时间段"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-2" />
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="放大"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-16 text-center">
              {zoomLevel === 'day' ? '按天' : zoomLevel === 'week' ? '按周' : '按月'}
            </span>
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              title="缩小"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          当前时间范围：{currentDate.format('YYYY-MM-DD')}
        </div>
      </div>

      {/* 甘特图内容 */}
      <div className="flex-1 overflow-auto p-4">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">暂无任务数据</h3>
              <p>请先在列表视图中创建带有开始时间和预计完成时间的任务</p>
            </div>
          </div>
        ) : (
          <div>
            {/* 时间轴头部 */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 pb-2 sticky top-0 bg-white dark:bg-dark-card z-10">
              <div className="w-64 flex-shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300">
                任务
              </div>
              <div className="flex-1 flex relative">
                {timeline.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700"
                  >
                    {zoomLevel === 'day' 
                      ? date.format('MM-DD')
                      : zoomLevel === 'week'
                      ? `W${date.week()}`
                      : date.format('MM')}
                  </div>
                ))}
              </div>
            </div>

            {/* 甘特图网格区域 */}
            <div className="relative mt-2">
              {/* 垂直经线（时间网格线） */}
              <div className="absolute inset-0 flex pointer-events-none z-0">
                <div className="w-64 flex-shrink-0" />
                <div className="flex-1 flex">
                  {timeline.map((date, index) => (
                    <div
                      key={index}
                      className={`flex-1 border-l ${
                        date.day() === 0 || date.date() === 1 
                          ? 'border-gray-300 dark:border-gray-600' 
                          : 'border-gray-100 dark:border-gray-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 任务条 */}
              <div className="relative space-y-1">
                {tasks.filter(t => t.startDate || t.estimatedEndDate).map((task) => {
                  const position = getTaskPosition(task);
                  return (
                    <div key={task.id} className="flex items-center">
                      <div className="w-64 flex-shrink-0 text-sm text-gray-900 dark:text-white truncate pr-4">
                        {task.description}
                      </div>
                      <div className="flex-1 relative h-8">
                        {position && (
                          <div
                            className="absolute h-6 top-1 rounded text-xs text-white flex items-center px-2 truncate z-10"
                            style={{
                              left: position.left,
                              width: position.width,
                              backgroundColor: getProjectColor(task.projectId),
                            }}
                            title={`${task.description} - ${task.progress}%`}
                          >
                            {task.progress}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="flex-shrink-0 p-3 border-t border-light-border dark:border-dark-border bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600 dark:text-gray-400">项目:</span>
          {projects.map(project => (
            <div key={project.id} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-gray-700 dark:text-gray-300">{project.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

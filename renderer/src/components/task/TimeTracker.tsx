import { useState, useEffect } from 'react';
import { Clock, Play, Square, Trash2 } from 'lucide-react';
import { TimeLog } from '../../types';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

interface TimeTrackerProps {
  taskId: string;
  timeLogs: TimeLog[];
  onStart: (description?: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TimeTracker({ taskId: _taskId, timeLogs, onStart, onStop, onDelete }: TimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    // 检查是否有进行中的时间记录
    const activeLog = timeLogs.find(log => !log.endTime);
    if (activeLog) {
      setIsTracking(true);
      setCurrentLogId(activeLog.id);
      const startTime = dayjs(activeLog.startTime).valueOf();
      
      // 每秒更新经过的时间
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setIsTracking(false);
      setCurrentLogId(null);
      setElapsed(0);
    }
  }, [timeLogs]);

  const handleStart = () => {
    onStart(description);
    setDescription('');
  };

  const handleStop = () => {
    if (currentLogId) {
      onStop(currentLogId);
    }
  };

  const formatDuration = (ms: number) => {
    const d = dayjs.duration(ms);
    const hours = Math.floor(d.asHours());
    const minutes = d.minutes();
    const seconds = d.seconds();
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatTimeLog = (log: TimeLog) => {
    const start = dayjs(log.startTime);
    const end = log.endTime ? dayjs(log.endTime) : dayjs();
    const logDuration = end.diff(start, 'second');
    
    return {
      startTime: start.format('MM-DD HH:mm'),
      duration: formatDuration(logDuration * 1000),
      seconds: logDuration,
    };
  };

  const totalTime = timeLogs.reduce((sum, log) => {
    const info = formatTimeLog(log);
    return sum + info.seconds;
  }, 0);

  return (
    <div className="space-y-3">
      {/* 计时器头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isTracking ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            时间追踪
          </span>
        </div>
        <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
          {formatDuration(elapsed)}
        </div>
      </div>

      {/* 总时间统计 */}
      <div className="text-xs text-gray-500 dark:text-gray-400">
        总耗时：{formatDuration(totalTime * 1000)} ({timeLogs.length} 次记录)
      </div>

      {/* 控制按钮和输入 */}
      {!isTracking ? (
        <div className="space-y-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="本次工作内容描述（可选）..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-dark-bg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            开始计时
          </button>
        </div>
      ) : (
        <button
          onClick={handleStop}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <Square className="w-4 h-4" />
          停止计时
        </button>
      )}

      {/* 时间记录列表 */}
      {timeLogs.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {timeLogs.slice().reverse().map((log) => {
            const info = formatTimeLog(log);
            const isActive = !log.endTime;
            
            return (
              <div
                key={log.id}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  isActive 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {info.startTime}
                    </span>
                    {isActive && (
                      <span className="text-xs text-green-600 dark:text-green-400 animate-pulse">
                        进行中
                      </span>
                    )}
                  </div>
                  {log.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {log.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {info.duration}
                  </span>
                  {!isActive && (
                    <button
                      onClick={() => onDelete(log.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

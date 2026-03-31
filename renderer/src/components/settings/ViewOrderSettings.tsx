import { useEffect } from 'react';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useViewConfigStore } from '../../stores/viewConfigStore';

export function ViewOrderSettings() {
  const { views, updateViewOrder, resetViews } = useViewConfigStore();
  
  // 确保视图已加载
  useEffect(() => {
    if (views.length === 0) {
      // 会在 Layout 组件中加载
    }
  }, [views]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newViews = [...views];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= views.length) return;
    
    // 交换位置
    [newViews[index], newViews[targetIndex]] = [newViews[targetIndex], newViews[index]];
    
    updateViewOrder(newViews);
  };

  const handleToggle = (index: number) => {
    const newViews = views.map((view, i) => 
      i === index ? { ...view, enabled: !view.enabled } : view
    );
    updateViewOrder(newViews);
  };

  const handleReset = () => {
    resetViews();
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">视图顺序</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              拖动或点击箭头调整侧边栏视图顺序
            </p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-primary hover:underline"
        >
          重置
        </button>
      </div>

      <div className="space-y-2">
        {views.map((view, index) => (
          <div
            key={view.id}
            className={`flex items-center gap-2 p-2 rounded transition-colors ${
              view.enabled 
                ? 'bg-white dark:bg-dark-card' 
                : 'bg-gray-200 dark:bg-gray-700 opacity-60'
            }`}
          >
            {/* 拖拽手柄 */}
            <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <GripVertical className="w-4 h-4" />
            </div>

            {/* 视图图标 */}
            <span className="text-lg">{view.iconLabel}</span>

            {/* 视图名称 */}
            <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
              {view.name}
            </span>

            {/* 移动按钮 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="上移"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMove(index, 'down')}
                disabled={index === views.length - 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                title="下移"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* 启用/禁用开关 */}
            <button
              onClick={() => handleToggle(index)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                view.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              title={view.enabled ? '点击隐藏' : '点击显示'}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  view.enabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        💡 提示：点击开关可以隐藏不需要的视图，被隐藏的视图将不会在侧边栏显示
      </div>
    </div>
  );
}

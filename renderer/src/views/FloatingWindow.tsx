import { useState } from 'react';

export function FloatingWindow() {
  const [opacity, setOpacity] = useState(0.9);
  const [clickThrough, setClickThrough] = useState(false);

  const handleToggleClickThrough = async () => {
    const result = await window.electronAPI.toggleClickThrough();
    if (result.success) {
      setClickThrough(result.clickThrough);
    }
  };

  const handleOpacityChange = async (value: number) => {
    setOpacity(value);
    await window.electronAPI.setWindowOpacity(value);
  };

  return (
    <div className="w-full h-full bg-white/90 dark:bg-dark-card/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* 标题栏 */}
      <div className="h-8 bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 rounded-t-lg flex items-center justify-between px-3 cursor-move">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          悬浮窗口
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleClickThrough}
            className={`p-1 rounded text-xs ${
              clickThrough 
                ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
            }`}
            title={clickThrough ? '点击穿透已开启' : '点击穿透已关闭'}
          >
            穿透
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-3">
        {/* 透明度调节 */}
        <div className="mb-3">
          <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">
            透明度：{Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* 快捷操作 */}
        <div className="space-y-2">
          <button
            onClick={handleToggleClickThrough}
            className={`w-full px-3 py-1.5 text-xs rounded-md transition-colors ${
              clickThrough
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {clickThrough ? '✓ 点击穿透开启' : '点击穿透关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}

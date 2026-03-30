import { useEffect } from 'react';
import { useErrorStore } from '../stores/errorStore';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export function ToastContainer() {
  const { errors, removeError, clearErrors } = useErrorStore();

  // 组件卸载时清除所有错误
  useEffect(() => {
    return () => clearErrors();
  }, [clearErrors]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error) => (
        <div
          key={error.id}
          className={`${getColors(error.type)} px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-slide-up`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(error.type)}
          </div>
          <div className="flex-1 text-sm">{error.message}</div>
          <button
            onClick={() => removeError(error.id)}
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

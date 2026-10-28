import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { KanbanSquare, Search, Plus, ChevronRight, FolderOpen } from 'lucide-react';
import { useTagStore } from '../stores/tagStore';
import { useErrorStore } from '../stores/errorStore';
import { TagEditDialog } from '../components/tag/TagEditDialog';
import type { Tag } from '../types';

/** 项目（分类）汇总数据，由主进程 tags:getBoardSummary 返回 */
interface ProjectSummary {
  id: string;
  name: string;
  color: string;
  totalTasks: number;
  byStatus: Record<string, number>;
  averageProgress: number;
}

const STATUS_META: Array<{ status: string; label: string; dot: string; bar: string }> = [
  { status: 'todo', label: '待处理', dot: 'bg-slate-400', bar: 'bg-slate-400' },
  { status: 'in-progress', label: '进行中', dot: 'bg-blue-500', bar: 'bg-blue-500' },
  { status: 'review', label: '等待确认', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  { status: 'done', label: '已完成', dot: 'bg-teal-500', bar: 'bg-teal-500' },
  { status: 'blocked', label: '已暂停', dot: 'bg-red-500', bar: 'bg-red-500' },
];

/**
 * 计划看板首页：先列出所有项目（分类 = 项目），
 * 点击项目卡片才进入该项目的计划排期看板（/board/:projectId）。
 */
export function BoardView() {
  const navigate = useNavigate();
  const { createTag } = useTagStore();
  const { addError } = useErrorStore();

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [unassigned, setUnassigned] = useState<ProjectSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    if (!window.electronAPI?.getBoardSummary) return;
    setLoading(true);
    try {
      const res = await window.electronAPI.getBoardSummary();
      if (res.success) {
        setProjects(res.data.projects ?? []);
        setUnassigned(res.data.unassigned ?? null);
      } else {
        addError(res.error || '项目列表加载失败', 'error');
      }
    } catch (err) {
      addError(err instanceof Error ? err.message : '项目列表加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const keyword = searchTerm.trim().toLowerCase();

  const visibleProjects = useMemo(() => {
    const list = keyword
      ? projects.filter((p) => p.name.toLowerCase().includes(keyword))
      : projects;
    // 任务多的项目排在前面
    return [...list].sort((a, b) => b.totalTasks - a.totalTasks);
  }, [projects, keyword]);

  const showUnassigned = !!unassigned && unassigned.totalTasks > 0 && !keyword;

  const totalTasks = useMemo(
    () => projects.reduce((sum, p) => sum + p.totalTasks, 0) + (unassigned?.totalTasks ?? 0),
    [projects, unassigned]
  );

  const handleCreateProject = async (tagData: Partial<Tag>) => {
    const created = await createTag({ name: tagData.name || '未命名项目', color: tagData.color });
    setDialogOpen(false);
    if (created) {
      addError('项目已创建', 'success');
      load();
    }
  };

  const renderCard = (project: ProjectSummary, muted = false) => {
    const total = Math.max(0, project.totalTasks);
    // 状态占比条的基准值，避免全 0 时除零
    const ratioBase = total || 1;

    return (
      <button
        key={project.id}
        onClick={() => navigate(`/board/${project.id}`)}
        className={`group text-left flex flex-col min-h-[340px] p-6 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 ${
          muted
            ? 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-dark-card'
        }`}
      >
        {/* 标题 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
              {project.name}
            </h3>
          </div>
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors" />
        </div>

        {/* 任务总数 */}
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{total}</span>
          <span className="text-sm text-gray-400">个任务</span>
        </div>

        {/* 平均进度 */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>平均进度</span>
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {project.averageProgress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, project.averageProgress))}%`,
                backgroundColor: project.color,
              }}
            />
          </div>
        </div>

        {/* 状态分布条 */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>状态分布</span>
            <span>{total} 个任务</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
            {STATUS_META.map((meta) => {
              const count = project.byStatus?.[meta.status] ?? 0;
              if (!count) return null;
              return (
                <div
                  key={meta.status}
                  className={`h-full ${meta.bar}`}
                  style={{ width: `${(count / ratioBase) * 100}%` }}
                  title={`${meta.label} ${count}`}
                />
              );
            })}
          </div>
        </div>

        {/* 各状态明细 */}
        <div className="mt-4 space-y-2">
          {STATUS_META.map((meta) => {
            const count = project.byStatus?.[meta.status] ?? 0;
            const pct = total ? Math.round((count / ratioBase) * 100) : 0;
            return (
              <div key={meta.status} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                  {meta.label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${meta.bar} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-14 text-right flex-shrink-0">
                  {count} · {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* 底部引导 */}
        <div className="mt-auto pt-4 flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-teal-500 transition-colors">
          进入排期看板
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-light-bg dark:bg-dark-bg">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KanbanSquare className="w-6 h-6 text-teal-500" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">项目计划看板</h1>
            <span className="px-2 py-0.5 text-xs rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 font-medium">
              {projects.length} 个项目 · {totalTasks} 个任务
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索项目"
                className="w-52 pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          </div>
        </div>

        {loading && projects.length === 0 && (
          <p className="text-sm text-gray-400">加载中…</p>
        )}
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {!loading && visibleProjects.length === 0 && !showUnassigned ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
            <FolderOpen className="w-10 h-10" />
            <p className="text-sm">{keyword ? '没有匹配的项目' : '还没有项目，先新建一个吧'}</p>
            {!keyword && (
              <button
                onClick={() => setDialogOpen(true)}
                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
              >
                新建项目
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleProjects.map((p) => renderCard(p))}
            {showUnassigned && unassigned && (
              <>
                {renderCard(unassigned, true)}
                <p className="col-span-full text-xs text-gray-400 -mt-1">
                  未归类任务未归属任何项目，进入后可查看；在任务编辑中选择分类即可归入项目。
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <TagEditDialog
        open={dialogOpen}
        tag={null}
        onClose={() => setDialogOpen(false)}
        onSave={handleCreateProject}
      />
    </div>
  );
}

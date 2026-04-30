/**
 * AISettings - AI 设置面板
 *
 * 集成到 SettingsPanel 中，用于配置 LLM Provider：
 * - Provider 选择（DeepSeek / 通义千问 / Ollama）
 * - API Key 输入
 * - 模型选择
 * - 连接测试
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bot, Check, X, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { useAgent } from '../../hooks/useAgent';
import type { LLMProviderType } from '../../types/agent';

// ProviderType 显示信息
const PROVIDER_INFO: Record<LLMProviderType, { label: string; desc: string; defaultModel: string; models: string[]; needsKey: boolean; needsBaseUrl: boolean }> = {
  deepseek: {
    label: 'DeepSeek',
    desc: '深度求索 - 高性价比，推荐首选',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    needsKey: true,
    needsBaseUrl: false,
  },
  qwen: {
    label: '通义千问',
    desc: '阿里云通义千问 - 中文优化',
    defaultModel: 'qwen-turbo',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max', 'qwen-long'],
    needsKey: true,
    needsBaseUrl: false,
  },
  ollama: {
    label: 'Ollama（本地）',
    desc: '本地部署，数据完全私密',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'deepseek-r1', 'mistral'],
    needsKey: false,
    needsBaseUrl: true,
  },
  moonshot: {
    label: 'Kimi（月之暗面）',
    desc: 'Kimi 长上下文模型，中文理解强',
    defaultModel: 'moonshot-v1-8k',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    needsKey: true,
    needsBaseUrl: false,
  },
};

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function AISettings() {
  const agent = useAgent();
  const [provider, setProvider] = useState<LLMProviderType>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [enabled, setEnabled] = useState(true);
  const [autoContext, setAutoContext] = useState(true);
  const [confirmBeforeWrite, setConfirmBeforeWrite] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 从 store 初始化表单值
  useEffect(() => {
    if (agent.config) {
      setProvider(agent.config.provider as LLMProviderType);
      setApiKey(''); // 不回填脱敏 key
      setBaseUrl(agent.config.baseUrl ?? '');
      setModel(agent.config.model);
      setTemperature(agent.config.temperature ?? 0.7);
      setMaxTokens(agent.config.maxTokens ?? 4096);
      setEnabled(agent.config.enabled);
      setAutoContext(agent.config.autoContext);
      setConfirmBeforeWrite(agent.config.confirmBeforeWrite);
    }
  }, [agent.config]);

  // 切换 provider 时更新默认值
  const handleProviderChange = useCallback((p: LLMProviderType) => {
    setProvider(p);
    setModel(PROVIDER_INFO[p].defaultModel);
    setApiKey('');
    if (p === 'ollama') setBaseUrl('http://localhost:11434');
    else setBaseUrl('');
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTestStatus('testing');
    setTestMsg('');
    const result = await agent.testConnection(provider);
    if (result.available) {
      setTestStatus('success');
      setTestMsg(`连接成功 · ${result.provider ?? provider} · ${result.model ?? model}`);
    } else {
      setTestStatus('error');
      setTestMsg(result.error ?? '连接失败，请检查配置');
    }
  }, [agent, provider, model]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const config: Record<string, unknown> = {
      provider,
      model,
      temperature,
      maxTokens,
      enabled,
      autoContext,
      confirmBeforeWrite,
    };
    if (apiKey.trim()) config.apiKey = apiKey.trim();
    if (baseUrl.trim()) config.baseUrl = baseUrl.trim();

    const ok = await agent.updateConfig(config);
    setSaving(false);
    if (ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  }, [agent, provider, apiKey, baseUrl, model, temperature, maxTokens, enabled, autoContext, confirmBeforeWrite]);

  const info = PROVIDER_INFO[provider];

  return (
    <div className="space-y-4">
      {/* Provider 选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          AI 提供商
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PROVIDER_INFO) as LLMProviderType[]).map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-all ${
                provider === p
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Bot className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{PROVIDER_INFO[p].label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                  {PROVIDER_INFO[p].desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      {info.needsKey && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            API Key
            {agent.config?.apiKey && (
              <span className="ml-2 text-xs text-gray-400 font-normal">
                (已设置：{agent.config.apiKey})
              </span>
            )}
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="输入新 API Key（留空保持现有）"
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label={showKey ? '隐藏 Key' : '显示 Key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Base URL（Ollama） */}
      {info.needsBaseUrl && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            服务地址
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={provider === 'ollama' ? 'http://localhost:11434' : ''}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      )}

      {/* 模型选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          模型
        </label>
        <div className="relative">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full appearance-none px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary transition-colors pr-8"
          >
            {info.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* 行为设置 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          行为设置
        </label>
        {[
          { key: 'enabled', label: 'AI 功能总开关', desc: '启用/禁用 AI 助手', value: enabled, setter: setEnabled },
          { key: 'autoContext', label: '自动感知上下文', desc: '自动将当前页面/项目传给 AI', value: autoContext, setter: setAutoContext },
          { key: 'confirmBeforeWrite', label: '写操作确认', desc: '创建/修改/删除操作前需要确认', value: confirmBeforeWrite, setter: setConfirmBeforeWrite },
        ].map(({ key, label, desc, value, setter }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
            <button
              onClick={() => setter(!value)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                value ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={value}
              aria-label={label}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* 高级参数 */}
      <details className="group">
        <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 select-none">
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          高级参数
        </summary>
        <div className="mt-3 space-y-3 pl-1">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Temperature（创意度）: {temperature}
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>精准</span>
              <span>创意</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              最大 Token 数
            </label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              min={512}
              max={32768}
              step={512}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </details>

      {/* 测试连接 + 结果 */}
      <div>
        <Button
          onClick={handleTestConnection}
          disabled={testStatus === 'testing'}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          {testStatus === 'testing' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            '测试连接'
          )}
        </Button>
        {testStatus !== 'idle' && testStatus !== 'testing' && (
          <div
            className={`mt-2 flex items-center gap-2 text-xs p-2 rounded-lg ${
              testStatus === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}
          >
            {testStatus === 'success' ? (
              <Check className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <X className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            {testMsg}
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            保存中...
          </>
        ) : saveSuccess ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            已保存
          </>
        ) : (
          '保存配置'
        )}
      </Button>
    </div>
  );
}

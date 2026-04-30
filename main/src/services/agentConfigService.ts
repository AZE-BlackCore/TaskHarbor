/**
 * Agent 配置持久化服务
 * 使用 electron-store 加密存储 API Key 等敏感配置
 */

import type { AgentConfig } from '../agent/types';
import { DEFAULT_AGENT_CONFIG } from '../agent/types';

let storeInstance: any = null;

function getStore() {
  if (!storeInstance) {
    const Store = require('electron-store');
    storeInstance = new Store({
      name: 'agent-config',
      encryptionKey: 'taskharbor-agent-config-v1',
      defaults: {
        agentConfig: DEFAULT_AGENT_CONFIG,
      },
    });
  }
  return storeInstance;
}

/**
 * 获取 Agent 配置
 */
export function getAgentConfig(): AgentConfig {
  try {
    const store = getStore();
    const saved = store.get('agentConfig', {}) as Partial<AgentConfig>;
    return { ...DEFAULT_AGENT_CONFIG, ...saved };
  } catch (error) {
    console.error('[AgentConfigService] Failed to get config:', error);
    return { ...DEFAULT_AGENT_CONFIG };
  }
}

/**
 * 保存 Agent 配置
 */
export function saveAgentConfig(config: Partial<AgentConfig>): AgentConfig {
  try {
    const store = getStore();
    const current = getAgentConfig();
    const updated = { ...current, ...config };
    store.set('agentConfig', updated);
    console.log('[AgentConfigService] Config saved, provider:', updated.provider);

    return updated;
  } catch (error) {
    console.error('[AgentConfigService] Failed to save config:', error);
    throw error;
  }
}

/**
 * 重置配置为默认值
 */
export function resetAgentConfig(): AgentConfig {
  return saveAgentConfig(DEFAULT_AGENT_CONFIG);
}

/**
 * 获取安全展示版本（API Key 脱敏）
 */
export function getSafeConfig(): Omit<AgentConfig, 'apiKey'> & { apiKey: string } {
  const config = getAgentConfig();
  const apiKey = config.apiKey
    ? `${config.apiKey.slice(0, 4)}${'*'.repeat(Math.max(0, config.apiKey.length - 8))}${config.apiKey.slice(-4)}`
    : '';
  return { ...config, apiKey };
}

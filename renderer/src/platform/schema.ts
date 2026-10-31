/**
 * platform/schema —— Vite 侧加载 DDL 单一真源
 * 桌面端与移动端必须由同一份 core/schema 建库（红线：禁止 DDL 双写）
 */

import schemaSqlRaw from '../../../core/schema/schema.sql?raw';
import migrationSqlRaw from '../../../core/schema/migrations/001_sync_enable.sql?raw';
import versionInfo from '../../../core/schema/version.json';

export const SCHEMA_SQL = schemaSqlRaw;
export const MIGRATION_SQL_001 = migrationSqlRaw;

export const SYNC_TABLES: string[] = versionInfo.syncTables;
export const SCHEMA_VERSION: number = versionInfo.schemaVersion;
export const PAGE_SIZE: number = versionInfo.pageSize;
export const MIN_DESKTOP_VERSION: string = versionInfo.minDesktopVersion;
export const MIN_MOBILE_VERSION: string = versionInfo.minMobileVersion;

/**
 * 移动端「扫码配对电脑」——解析桌面端同步二维码并发起配对
 *
 * 桌面端二维码编码格式见 renderer/src/views/SyncView.tsx：
 *   JSON.stringify({ h: host, p: port, n: pin, v: '1' })
 * 其中 h=电脑局域网 IP，p=Hub 端口(18766)，n=6 位配对码。
 *
 * 扫码插件：@capacitor/barcode-scanner@3（Capacitor 8 对应版本）
 *   API: CapacitorBarcodeScanner.scanBarcode({ hint }) -> { ScanResult }
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';

export interface ParsedPairPayload {
  baseUrl: string;
  pin: string;
}

/**
 * 解析桌面端生成的配对二维码内容。
 * 返回 baseUrl（http://host:port）与配对码 pin；无法识别时抛出可读错误。
 */
export function parsePairQr(raw: string): ParsedPairPayload {
  const text = (raw ?? '').trim();
  if (!text) throw new Error('扫码内容为空，请重试');

  // 主路径：桌面端标准 JSON 格式 { h, p, n, v }
  try {
    const obj = JSON.parse(text);
    if (obj && obj.h && obj.p && obj.n != null) {
      const host = String(obj.h).replace(/\/+$/, '');
      const port = String(obj.p);
      return { baseUrl: `http://${host}:${port}`, pin: String(obj.n) };
    }
  } catch {
    /* 非 JSON，走下方兜底 */
  }

  // 兜底：扫码内容本身就是合法 URL（不含配对码，需手动补）
  if (/^https?:\/\//i.test(text)) {
    return { baseUrl: text.replace(/\/+$/, ''), pin: '' };
  }

  throw new Error('无法识别的二维码：请使用小湾清单桌面端「同步与设备」页生成的配对二维码');
}

/** 调起原生扫码，返回解析后的配对信息 */
export async function scanPairQr(): Promise<ParsedPairPayload> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('扫码配对仅在安卓 App 内可用');
  }
  const result = await CapacitorBarcodeScanner.scanBarcode({
    hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
    scanInstructions: '将电脑端「同步与设备」页的二维码放入取景框',
  });
  const raw = result?.ScanResult;
  if (!raw) throw new Error('未扫描到内容，请重试');
  return parsePairQr(raw);
}

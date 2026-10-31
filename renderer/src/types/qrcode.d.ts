/**
 * qrcode 的本地类型声明（npm 安装卡住时改用手动放置的运行时包，类型在此补齐）
 * 仅声明本项目用到的 API。
 */

declare module 'qrcode' {
  export interface QRCodeRenderersOptions {
    width?: number;
    margin?: number;
    scale?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    [key: string]: unknown;
  }

  export function toDataURL(text: string, options?: QRCodeRenderersOptions): Promise<string>;
  export function toDataURL(
    canvas: unknown,
    text: string,
    options?: QRCodeRenderersOptions
  ): Promise<string>;
  export function toString(text: string, options?: QRCodeRenderersOptions): Promise<string>;
  export function toBuffer(text: string, options?: QRCodeRenderersOptions): Promise<Buffer>;
}

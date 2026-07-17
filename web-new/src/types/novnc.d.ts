declare module '@novnc/novnc/core/rfb.js' {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: Record<string, unknown>);
    disconnect(): void;
    sendCtrlAltDel(): void;
    addEventListener(type: string, listener: (ev: unknown) => void): void;
    removeEventListener(type: string, listener: (ev: unknown) => void): void;
  }
}

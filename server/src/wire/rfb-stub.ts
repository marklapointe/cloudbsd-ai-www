/**
 * Minimal RFB 3.8 server over WebSocket for @novnc/novnc.
 * Paints a solid CloudBSD-branded test pattern so console is functional
 * without a live bhyve/websockify agent (Rule #13: still backend-mediated).
 */
import type { WebSocket } from 'ws';

const WIDTH = 640;
const HEIGHT = 400;

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(n, 0);
  return b;
}
function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function pixelFormat(): Buffer {
  // 32bpp, depth endian, true colour, 8-8-8
  const b = Buffer.alloc(16);
  b[0] = 32; // bits-per-pixel
  b[1] = 24; // depth
  b[2] = 0; // big-endian-flag
  b[3] = 1; // true-colour-flag
  b.writeUInt16BE(255, 4); // red-max
  b.writeUInt16BE(255, 6); // green-max
  b.writeUInt16BE(255, 8); // blue-max
  b[10] = 16; // red-shift
  b[11] = 8; // green-shift
  b[12] = 0; // blue-shift
  return b;
}

function buildFramebuffer(): Buffer {
  // BGRA little-endian (32bpp LE)
  const buf = Buffer.alloc(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const i = (y * WIDTH + x) * 4;
      // gradient + banner band
      const band = y > 40 && y < 90;
      buf[i] = band ? 0xb5 : Math.floor((x / WIDTH) * 80); // B
      buf[i + 1] = band ? 0x63 : Math.floor((y / HEIGHT) * 40); // G
      buf[i + 2] = band ? 0x25 : 20; // R
      buf[i + 3] = 255;
    }
  }
  return buf;
}

type Phase = 'version' | 'security' | 'init' | 'running';

export function attachRfbSession(ws: WebSocket, vmId: string): void {
  let phase: Phase = 'version';
  let buf = Buffer.alloc(0);
  const fb = buildFramebuffer();
  const name = `CloudBSD ${vmId}`;

  const send = (data: Buffer | string) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  };

  // Server protocol version
  send(Buffer.from('RFB 003.008\n', 'ascii'));

  const pump = () => {
    if (phase === 'version') {
      if (buf.length < 12) return;
      buf = buf.subarray(12);
      // security types: 1 type, None=1
      send(Buffer.from([1, 1]));
      phase = 'security';
    }
    if (phase === 'security') {
      if (buf.length < 1) return;
      buf = buf.subarray(1);
      // security result OK
      send(u32(0));
      phase = 'init';
    }
    if (phase === 'init') {
      // ClientInit shared-flag
      if (buf.length < 1) return;
      buf = buf.subarray(1);
      // ServerInit
      const nameBuf = Buffer.from(name, 'utf8');
      send(
        Buffer.concat([
          u16(WIDTH),
          u16(HEIGHT),
          pixelFormat(),
          u32(nameBuf.length),
          nameBuf,
        ]),
      );
      phase = 'running';
      // Initial full framebuffer update (raw)
      sendFramebuffer(ws, fb);
      return;
    }
    if (phase === 'running') {
      // Handle client messages loosely
      while (buf.length >= 1) {
        const type = buf[0];
        if (type === 3) {
          // FramebufferUpdateRequest — 10 bytes
          if (buf.length < 10) return;
          buf = buf.subarray(10);
          sendFramebuffer(ws, fb);
        } else if (type === 4) {
          // KeyEvent — 8 bytes
          if (buf.length < 8) return;
          buf = buf.subarray(8);
        } else if (type === 5) {
          // PointerEvent — 6 bytes
          if (buf.length < 6) return;
          buf = buf.subarray(6);
        } else if (type === 6) {
          // ClientCutText
          if (buf.length < 8) return;
          const len = buf.readUInt32BE(4);
          if (buf.length < 8 + len) return;
          buf = buf.subarray(8 + len);
        } else if (type === 2) {
          // SetEncodings
          if (buf.length < 4) return;
          const n = buf.readUInt16BE(2);
          if (buf.length < 4 + n * 4) return;
          buf = buf.subarray(4 + n * 4);
        } else if (type === 0) {
          // SetPixelFormat — 20 bytes
          if (buf.length < 20) return;
          buf = buf.subarray(20);
        } else {
          // Unknown — drop one byte to resync
          buf = buf.subarray(1);
        }
      }
    }
  };

  ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    const chunk = Buffer.isBuffer(data)
      ? data
      : Array.isArray(data)
        ? Buffer.concat(data)
        : Buffer.from(data);
    buf = Buffer.concat([buf, chunk]);
    try {
      pump();
    } catch (e) {
      console.error('[RFB] session error', e);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }
  });
}

function sendFramebuffer(ws: WebSocket, fb: Buffer): void {
  if (ws.readyState !== ws.OPEN) return;
  // FramebufferUpdate: type 0, padding, 1 rect
  // rect: x,y,w,h, encoding raw(0), pixels
  const header = Buffer.alloc(4 + 12);
  header[0] = 0; // FramebufferUpdate
  header[1] = 0;
  header.writeUInt16BE(1, 2); // number of rects
  header.writeUInt16BE(0, 4); // x
  header.writeUInt16BE(0, 6); // y
  header.writeUInt16BE(WIDTH, 8);
  header.writeUInt16BE(HEIGHT, 10);
  header.writeInt32BE(0, 12); // raw encoding
  ws.send(Buffer.concat([header, fb]));
}

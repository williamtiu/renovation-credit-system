/**
 * TtyTransport — Linux 串口 I/O，唔使用 serialport
 *
 * 點解要自己開：serialport 嘅 native binding 用 uv_poll_init，Bun 1.4.4 (arm64)
 * 未支援，open 一開就 panic(main thread): unsupported uv function
 * (https://github.com/oven-sh/bun/issues/18546)。SerialPort.list() 用得，
 * open() 直接崩。所以呢度用 fs.open + fs.read/write 直接行 char device，
 * 唔經任何 NAPI binding。
 *
 * 6,000,000 baud 唔係標準 termios 速度（stty 會收「invalid argument」）。
 * 標準表只到 4,000,000；6M 要靠 FTDI custom divisor（ASYNC_SPD_CUST），
 * 即 pyserial 內部嘅做法。我哋叫 pyserial 幫手設好，再返嚟用 fs 度行 byte。
 */

import { openSync, closeSync, readSync, writeSync, constants } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const READ_CHUNK = 4096

/** O_NOCTTY: 串口唔好變成 terminal 嘅 controlling terminal.
 *  O_NONBLOCK: 讀取唔會阻塞事件循環；EAGAIN 當「而家冇嘢」。 */
const OPEN_FLAGS = constants.O_RDWR | constants.O_NOCTTY | constants.O_NONBLOCK

export interface TtyOpenResult {
  /** baud 設定係咪成功（pty 冇 baud 概念，會回 false 但照樣可用） */
  baudConfigured: boolean
  baudMessage: string
  /** 其他持有者（用過 allowSharedBus 開共享 bus 時要講出嚟） */
  sharedWith?: string[]
}

export class TtyTransport {
  private fd: number | null = null
  private path: string | null = null

  get isOpen(): boolean {
    return this.fd !== null
  }

  open(path: string, baudrate: number, opts?: { allowSharedBus?: boolean }): TtyOpenResult {
    // A tty is NOT exclusively owned by the OS — two processes can open the same
    // char device and silently interleave bytes. Two controllers on the IM6014
    // bus means two commanders for the same joints, so we refuse to open when
    // somebody else already holds the device.
    const holders = this.currentHolders(path)
    if (holders.length && !opts?.allowSharedBus) {
      throw new Error(
        `${path} 已經俾其他程序開啟（PID ${holders.join(', ')}）。串口係多条馬達共用嘅匯流排，` +
        `兩個控制器同時行會互相搶關節 — 請先停止對方（例如 ROS 2 嘅 arm_bridge / r17a-ros.service）。`
      )
    }

    const res = this.configurePort(path, baudrate)
    this.fd = openSync(path, OPEN_FLAGS)
    this.path = path
    if (holders.length) res.sharedWith = holders
    return res
  }

  /** PIDs currently holding the device, excluding this process. */
  private currentHolders(path: string): string[] {
    let r
    try {
      r = spawnSync('fuser', [path], { encoding: 'utf8', timeout: 4000 })
    } catch {
      return []
    }
    if (r.status !== 0 && r.status !== 1) return []
    const text = `${r.stdout ?? ''} ${r.stderr ?? ''}`
    const pids = text
      .split(/\s+/)
      .map((t) => t.replace(/[^0-9]/g, ''))
      .filter((t) => t.length > 0)
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0 && n !== process.pid)
    return Array.from(new Set(pids)).map(String)
  }

  /** raw mode + baud via pyserial (custom divisor for non-standard speeds). */
  private configurePort(path: string, baudrate: number): TtyOpenResult {
    const helper = join(dirname(fileURLToPath(import.meta.url)), 'serial-setup.py')
    const r = spawnSync('python3', [helper, path, String(baudrate)], { encoding: 'utf8', timeout: 8000 })
    const msg = (r.stdout ?? '').trim() || (r.stderr ?? '').trim() || `helper exit ${r.status}`
    return { baudConfigured: r.status === 0, baudMessage: msg }
  }

  /** One non-blocking read; empty Buffer when nothing is pending. */
  read(): Buffer {
    if (this.fd === null) return Buffer.alloc(0)
    const buf = Buffer.alloc(READ_CHUNK)
    try {
      const n = readSync(this.fd, buf, 0, READ_CHUNK, null)
      return n > 0 ? buf.subarray(0, n) : Buffer.alloc(0)
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      // EAGAIN/EWOULDBLOCK on a non-blocking tty just means "no bytes now".
      if (code === 'EAGAIN' || code === 'EWOULDBLOCK') return Buffer.alloc(0)
      throw err
    }
  }

  write(data: Buffer): void {
    if (this.fd === null) throw new Error('tty not open')
    writeSync(this.fd, data)
  }

  close(): void {
    if (this.fd === null) return
    try { closeSync(this.fd) } catch { /* already gone */ }
    this.fd = null
    this.path = null
  }
}

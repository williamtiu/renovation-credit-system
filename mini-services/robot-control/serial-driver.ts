/**
 * Serial Driver — IM6014 串列匯流排驅動（真機模式）
 * 
 * 直接透過 Linux serial port（預設 /dev/ttyUSB0, 6000000 baud）
 * 同 R1-7A 手臂嘅 IM6014 匯流排通訊。
 * 
 * ⚠️ 幀格式按 r1-7a_sdk 嘅 IM6014 協議實作：
 *    SDK 以編譯好嘅 C++ 庫封裝協議細節，Node 層以「橋接」方式
 *    同真機通訊有兩種做法：
 *    (A) 推薦 — BridgeDriver: 透過 UDP JSON-RPC 調用 C++ bridge（見 bridge-driver.ts）
 *    (B) 進階 — 本驅動: 直接幀級通訊，需要按照官方協議文檔調整幀格式
 * 
 * 本驅動保留完整骨架（打開/關閉/讀寫循環/重連），幀格式以 TODO 標示。
 */

import { emptyJointState } from './robot-model'
import type {
  HalDriver, DriverConfig, DriverEvent, LowLevelCommand, Telemetry,
} from './hal-types'
import { HalError } from './hal-types'

// serialport 只喺真機模式需要（原生模組）— 懶加載避免沙盒環境安裝失敗
let SerialPortCtor: any = null
async function loadSerialPort(): Promise<any> {
  if (SerialPortCtor) return SerialPortCtor
  try {
    const mod = await import('serialport')
    SerialPortCtor = mod.SerialPort
    return SerialPortCtor
  } catch {
    throw new HalError(
      'serialport 模組未安裝。請喺部署機上執行: bun add serialport（或 npm install serialport）',
      26
    )
  }
}

const READ_INTERVAL_MS = 5 // 200Hz 讀取循環

export class SerialDriver implements HalDriver {
  readonly mode = 'serial' as const
  private port: any = null
  private readTimer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private eventCb: ((ev: DriverEvent) => void) | null = null
  private telemetry: Telemetry = {
    joints: emptyJointState(),
    errorCode: 0,
    errorMessage: null,
    temp: 36,
  }
  private config: DriverConfig = { port: '/dev/ttyUSB0', baudrate: 6000000 }

  async connect(config: DriverConfig): Promise<void> {
    this.config = config
    if (this.connected) return

    const SerialPort = await loadSerialPort()
    const sp = await new Promise<any>((resolve, reject) => {
      const p = new SerialPort({
        path: config.port,
        baudRate: config.baudrate,
        autoOpen: true,
      }, (err: Error | null) => {
        if (err) {
          reject(new HalError(
            `無法打開 ${config.port} @ ${config.baudrate}: ${err.message}。` +
            `請確認裝置存在、已加入 dialout 群組 (sudo usermod -aG dialout $USER)，並且冇其他程序佔用。`,
            20
          ))
          return
        }
        resolve(p)
      })
    })

    sp.on('error', (err: Error) => {
      this.emit({ kind: 'error', message: `串口錯誤: ${err.message}`, code: 21 })
      this.teardown()
    })
    sp.on('close', () => {
      if (this.connected) {
        this.emit({ kind: 'disconnect', message: '串口連線中斷，自動重連中…', code: 22 })
        this.connected = false
        this.scheduleReconnect()
      }
    })

    this.port = sp
    this.connected = true
    this.startReadLoop()
    this.emit({ kind: 'info', message: `串口已連線: ${config.port} @ ${config.baudrate} (IM6014 bus)` })
  }

  async disconnect(): Promise<void> {
    this.teardown()
    this.emit({ kind: 'info', message: '串口已斷開' })
  }

  isConnected(): boolean {
    return this.connected
  }

  getTelemetry(): Telemetry {
    return this.telemetry
  }

  async sendCommand(cmd: LowLevelCommand): Promise<void> {
    if (!this.connected || !this.port?.isOpen) {
      throw new HalError('串口未連線', 23)
    }
    const frame = this.encodeFrame(cmd)
    if (!frame) {
      throw new HalError(`指令尚未於串口驅動實作（請改用 bridge 模式）: ${cmd.type}`, 24)
    }
    await new Promise<void>((resolve, reject) => {
      this.port!.write(frame, (err) => (err ? reject(new HalError(err.message, 25)) : resolve()))
    })
  }

  onEvent(cb: (ev: DriverEvent) => void): void {
    this.eventCb = cb
  }

  // ---------- 幀編碼 ----------
  // TODO(r1-7a_sdk): 按官方 IM6014 協議補全幀格式。
  // SDK 嘅 ArmMotorBus 內部處理 URDF↔motor 轉換，本層輸出 URDF frame 數值。
  // 建議真機部署時使用 bridge 模式（C++ bridge 直接連結 SDK 靜態庫），
  // 避免喺 Node 重寫協議造成唔兼容。
  private encodeFrame(cmd: LowLevelCommand): Buffer | null {
    void cmd; void DOF; void ARM_HOME
    return null
  }

  // ---------- 讀取循環 ----------
  private startReadLoop(): void {
    this.readTimer = setInterval(() => {
      if (!this.port?.isOpen) return
      // TODO(r1-7a_sdk): 解析 IM6014 遙測回覆幀 → this.telemetry
    }, READ_INTERVAL_MS)
  }

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      try {
        await this.connect(this.config)
      } catch {
        this.scheduleReconnect()
      }
    }, 2000)
  }

  private teardown(): void {
    this.connected = false
    if (this.readTimer) clearInterval(this.readTimer)
    this.readTimer = null
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    if (this.port?.isOpen) {
      try { this.port.close() } catch { /* ignore */ }
    }
    this.port = null
  }

  private emit(ev: DriverEvent): void {
    this.eventCb?.(ev)
  }
}

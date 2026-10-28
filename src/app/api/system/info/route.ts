import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** GET /api/system/info — 系統資訊（架構、版本、連線拓撲） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      platform: 'R1-7A Robot Control Platform',
      version: '1.0.0',
      architecture: {
        style: 'ROS2-inspired layered architecture',
        layers: [
          { name: 'Presentation', tech: 'Next.js 16 Web UI', detail: 'Dashboard / 控制 / 姿勢庫 / 日誌 / 文檔' },
          { name: 'API Gateway', tech: 'REST (Next.js API) + WebSocket (socket.io :3003)', detail: 'rosbridge 風格閘道' },
          { name: 'Control Service', tech: 'Robot Control Service (:3002)', detail: 'Lifecycle Node + Safety Layer + Topic Bus' },
          { name: 'HAL', tech: 'Simulation / Serial (IM6014) / C++ Bridge', detail: '硬件抽象層，統一驅動接口' },
          { name: 'Hardware', tech: 'r1-7a_sdk (C++) → /dev/ttyUSB0 @ 6000000', detail: 'Unitree R1 7-DOF 機械臂' },
        ],
      },
      hardware: {
        robot: 'Unitree R1 — 7-DOF Robotic Arm',
        sdk: 'unitreerobotics/r1-7a_sdk (C++, IM6014 serial bus)',
        defaultPort: '/dev/ttyUSB0',
        baudrate: 6000000,
        frameConvention: 'URDF frame: urdf = dir * scale * motor + offset',
        commands: ['foc', 'home', 'goto', 'stop', 'zero_torque', 'clear', 'reset'],
      },
      services: {
        web: { port: 3000, role: 'Web UI + REST API' },
        control: { port: 3002, role: 'Robot Control Service (HAL+Safety+Controller)' },
        gateway: { port: 3003, role: 'WebSocket Gateway (rosbridge-style)' },
      },
      topics: [
        { topic: '/joint_states', hz: 10, via: 'WebSocket', desc: '關節即時遙測 (q/dq/tau/temp)' },
        { topic: '/robot_state', hz: 10, via: 'WebSocket', desc: '機械人整體狀態' },
        { topic: '/events', hz: 0.5, via: 'WebSocket', desc: '控制器事件流' },
      ],
    },
  })
}

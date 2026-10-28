'use client'

/**
 * R1-7A 機械臂控制平台 — 主頁面
 * 
 * 基於 ROS2 架構概念嘅 Unitree R1 7-DOF 機械臂底層控制平台：
 *   - Dashboard  即時監控（/joint_states 遙測、趨勢圖、事件流）
 *   - Control    手動關節控制（滑條 + goto/foc/home/stop 指令）
 *   - Poses      姿勢庫管理（一鍵執行、擷取當前姿勢）
 *   - Logs       指令審計日誌
 *   - API        REST + WebSocket API 完整文檔
 *   - Settings   硬體驅動模式配置（模擬/串口/C++ Bridge）
 */

import { useEffect } from 'react'
import { LayoutDashboard, SlidersHorizontal, Box, Library, History, ScrollText, KeyRound, BookOpen, Settings2, Github } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRobot } from '@/hooks/use-robot'
import { StatusHeader } from '@/components/robot/status-header'
import { Dashboard } from '@/components/robot/dashboard'
import { ControlPanel } from '@/components/robot/control-panel'
import { Arm3D } from '@/components/robot/arm-3d'
import { PosesPanel } from '@/components/robot/poses-panel'
import { TrajectoriesPanel } from '@/components/robot/trajectories-panel'
import { LogsPanel } from '@/components/robot/logs-panel'
import { KeysPanel } from '@/components/robot/keys-panel'
import { ApiDocs } from '@/components/robot/api-docs'
import { SettingsPanel } from '@/components/robot/settings-panel'
import { useToast } from '@/hooks/use-toast'

export default function Home() {
  const robot = useRobot()
  const { toast } = useToast()

  // E-stop 快捷鍵（Shift + Esc）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault()
        void robot.estop().then((r) => {
          toast({
            title: r.ok ? '🛑 緊急停止已執行' : '執行失敗',
            description: r.ok ? '所有指令已鎖定，請喺控制頁清除錯誤恢復' : r.message,
            variant: r.ok ? undefined : 'destructive',
          })
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [robot, toast])

  return (
    <div className="robot-bg min-h-screen flex flex-col">
      <StatusHeader
        state={robot.state}
        wsStatus={robot.wsStatus}
        onEstop={() =>
          void robot.estop().then((r) => {
            toast({
              title: r.ok ? '🛑 緊急停止已執行' : '執行失敗',
              description: r.ok ? '所有指令已鎖定，請喺控制頁清除錯誤恢復' : r.message,
              variant: r.ok ? undefined : 'destructive',
            })
          })
        }
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-5">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="mb-4 h-11 w-full justify-start overflow-x-auto bg-zinc-900/80 border border-zinc-800 rounded-xl p-1 custom-scroll">
            <TabTrigger icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard 總覽" value="dashboard" />
            <TabTrigger icon={<SlidersHorizontal className="h-4 w-4" />} label="Control 控制" value="control" />
            <TabTrigger icon={<Box className="h-4 w-4" />} label="3D 視圖" value="view3d" />
            <TabTrigger icon={<Library className="h-4 w-4" />} label="Poses 姿勢庫" value="poses" />
            <TabTrigger icon={<History className="h-4 w-4" />} label="軌跡錄製回放" value="trajectories" />
            <TabTrigger icon={<ScrollText className="h-4 w-4" />} label="Logs 日誌" value="logs" />
            <TabTrigger icon={<KeyRound className="h-4 w-4" />} label="API Keys" value="keys" />
            <TabTrigger icon={<BookOpen className="h-4 w-4" />} label="API 文檔" value="api" />
            <TabTrigger icon={<Settings2 className="h-4 w-4" />} label="Settings 設定" value="settings" />
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard robot={robot} />
          </TabsContent>
          <TabsContent value="control">
            <ControlPanel robot={robot} />
          </TabsContent>
          <TabsContent value="view3d">
            <Arm3D robot={robot} />
          </TabsContent>
          <TabsContent value="poses">
            <PosesPanel robot={robot} />
          </TabsContent>
          <TabsContent value="trajectories">
            <TrajectoriesPanel robot={robot} />
          </TabsContent>
          <TabsContent value="logs">
            <LogsPanel robot={robot} />
          </TabsContent>
          <TabsContent value="keys">
            <KeysPanel />
          </TabsContent>
          <TabsContent value="api">
            <ApiDocs />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsPanel robot={robot} />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-600">
          <span className="font-mono">
            R1-7A Robot Control Platform · ROS2-inspired architecture · Linux
          </span>
          <div className="flex items-center gap-3">
            <span>快捷鍵：Shift + Esc = 緊急停止</span>
            <a
              href="https://github.com/unitreerobotics/r1-7a_sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-zinc-400 transition-colors"
            >
              <Github className="h-3.5 w-3.5" aria-hidden />
              r1-7a_sdk
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function TabTrigger({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-9 gap-1.5 px-3.5 text-xs data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-400 data-[state=active]:border data-[state=active]:border-amber-500/40 rounded-lg text-zinc-400 shrink-0"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </TabsTrigger>
  )
}

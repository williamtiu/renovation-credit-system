import { useEffect, useState } from 'react';
import { Sidebar } from '../components/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/auth-context';
import { useData } from '../contexts/data-context';
import { Activity, Database, RefreshCcw, Server, ShieldCheck, User } from 'lucide-react';

type DeveloperSummary = {
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  counts: {
    companies: number;
    projects: number;
    loans: number;
    disputes: number;
    creditScores: number;
  };
  api: {
    base: string;
    projectEndpoints: string[];
    authEndpoints: string[];
  };
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export default function DeveloperPage() {
  const { user } = useAuth();
  const { isSyncing, syncError, refreshFromBackend } = useData();
  const [summary, setSummary] = useState<DeveloperSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/developer/summary`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || 'Failed to load developer summary');
      }
      setSummary(json.data as DeveloperSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load developer summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();
  }, []);

  const refreshAll = async () => {
    await refreshFromBackend();
    await loadSummary();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Developer Page</h1>
            <p className="text-sm text-gray-500 mt-1">New UI x Flask backend integration diagnostics</p>
          </div>
          <Button onClick={() => void refreshAll()} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <RefreshCcw className={`w-4 h-4 ${loading || isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 flex items-center gap-2"><User className="w-4 h-4" />Current User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-gray-900">{summary?.user?.name || user?.name || 'N/A'}</div>
              <div className="text-xs text-gray-500">{summary?.user?.email || user?.email || '-'}</div>
              <Badge className="mt-2 bg-indigo-100 text-indigo-700">{summary?.user?.role || user?.role || 'guest'}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 flex items-center gap-2"><Server className="w-4 h-4" />Data Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-gray-900">{isSyncing ? 'Syncing...' : 'Idle'}</div>
              <div className="text-xs text-gray-500 mt-1">{syncError ? syncError : 'Data context connected to /api endpoints'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600 flex items-center gap-2"><Activity className="w-4 h-4" />Backend Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-semibold text-gray-900">{summary?.timestamp ? new Date(summary.timestamp).toLocaleString() : '-'}</div>
              <div className="text-xs text-gray-500 mt-1">Server UTC heartbeat</div>
            </CardContent>
          </Card>
        </div>

        {(error || syncError) && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              {error || syncError}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Core Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg"><div className="text-gray-500">Companies</div><div className="text-lg font-semibold">{summary?.counts?.companies ?? '-'}</div></div>
                <div className="p-3 bg-gray-50 rounded-lg"><div className="text-gray-500">Projects</div><div className="text-lg font-semibold">{summary?.counts?.projects ?? '-'}</div></div>
                <div className="p-3 bg-gray-50 rounded-lg"><div className="text-gray-500">Loans</div><div className="text-lg font-semibold">{summary?.counts?.loans ?? '-'}</div></div>
                <div className="p-3 bg-gray-50 rounded-lg"><div className="text-gray-500">Disputes</div><div className="text-lg font-semibold">{summary?.counts?.disputes ?? '-'}</div></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Available API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium text-gray-700 mb-1">Auth</div>
                <div className="flex flex-wrap gap-1">
                  {(summary?.api?.authEndpoints || []).map((endpoint) => (
                    <Badge key={endpoint} variant="secondary">{endpoint}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium text-gray-700 mb-1">Projects</div>
                <div className="flex flex-wrap gap-1">
                  {(summary?.api?.projectEndpoints || []).map((endpoint) => (
                    <Badge key={endpoint} variant="secondary">{endpoint}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

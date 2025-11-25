import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Download, Filter, CheckCircle2, XCircle, TrendingUp, Shield, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface MixHistoryRecord {
  id: string;
  sessionId: string;
  walletPublicKey: string;
  grossAmount: string;
  platformFee: string;
  networkFees: string;
  totalFees: string;
  netAmount: string;
  solSent: string;
  zecReceived: string | null;
  exchangeRate: string | null;
  hopCount: number;
  preset: string | null;
  privacyScore: number | null;
  exchangeId: string | null;
  payoutAddress: string | null;
  status: 'completed' | 'failed' | 'refunded';
  createdAt: string;
  completedAt: string | null;
}

interface HistoryResponse {
  items: MixHistoryRecord[];
  total: number;
}

const safeNum = (val: string | null | undefined, decimals: number = 4): string => {
  if (!val) return '0';
  const num = parseFloat(val);
  return isNaN(num) ? '0' : num.toFixed(decimals);
};

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export default function History() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  // Redirect if not authenticated (after auth loading completes)
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/auth');
    }
  }, [authLoading, user, setLocation]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content while redirecting
  if (!user) {
    return null;
  }

  const { data, isLoading, error } = useQuery<HistoryResponse>({
    queryKey: ['/api/mix-history'],
  });

  const history = data?.items || [];

  const filteredHistory = history
    .filter(record => {
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const walletMatch = record.walletPublicKey.toLowerCase().includes(query);
        const payoutMatch = record.payoutAddress?.toLowerCase().includes(query);
        const sessionMatch = record.sessionId.toLowerCase().includes(query);
        const presetMatch = record.preset?.toLowerCase().includes(query);
        if (!walletMatch && !payoutMatch && !sessionMatch && !presetMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return parseFloat(b.solSent || '0') - parseFloat(a.solSent || '0');
    });

  const exportToCSV = () => {
    const headers = [
      'Date', 'Session ID', 'Wallet', 'Gross Amount (SOL)', 'Platform Fee (SOL)', 
      'Network Fees (SOL)', 'Total Fees (SOL)', 'Net Amount (SOL)', 'SOL Sent', 
      'ZEC Received', 'Exchange Rate', 'Hops', 'Preset', 'Privacy Score', 
      'Exchange ID', 'Payout Address', 'Status', 'Completed At'
    ];
    
    const rows = filteredHistory.map(record => [
      format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss'),
      record.sessionId,
      record.walletPublicKey,
      safeNum(record.grossAmount),
      safeNum(record.platformFee),
      safeNum(record.networkFees, 6),
      safeNum(record.totalFees),
      safeNum(record.netAmount),
      safeNum(record.solSent),
      record.zecReceived ? safeNum(record.zecReceived, 6) : 'N/A',
      record.exchangeRate ? safeNum(record.exchangeRate, 6) : 'N/A',
      record.hopCount.toString(),
      record.preset || 'N/A',
      record.privacyScore?.toString() || 'N/A',
      record.exchangeId || 'N/A',
      record.payoutAddress || 'N/A',
      record.status,
      record.completedAt ? format(new Date(record.completedAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mix-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'refunded':
        return <Badge variant="secondary"><TrendingUp className="h-3 w-3 mr-1" />Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalStats = {
    total: history.length,
    completed: history.filter(r => r.status === 'completed').length,
    totalSOL: history.reduce((sum, r) => sum + parseFloat(safeNum(r.solSent)), 0),
    totalZEC: history.reduce((sum, r) => sum + parseFloat(safeNum(r.zecReceived, 6)), 0),
    totalFees: history.reduce((sum, r) => sum + parseFloat(safeNum(r.totalFees)), 0),
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Mix History
              </h1>
              <p className="text-muted-foreground">Your complete mixing transaction history</p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline" disabled={filteredHistory.length === 0} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Mixes</div>
              <div className="text-xl md:text-2xl font-bold">{totalStats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Completed</div>
              <div className="text-xl md:text-2xl font-bold text-green-400">{totalStats.completed}</div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Mixed</div>
              <div className="text-xl md:text-2xl font-bold">{totalStats.totalSOL.toFixed(4)} SOL</div>
            </CardContent>
          </Card>
          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Fees</div>
              <div className="text-xl md:text-2xl font-bold">{totalStats.totalFees.toFixed(4)} SOL</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by wallet, ZEC address, session, or preset..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'date' | 'amount')}>
            <SelectTrigger className="w-full md:w-48" data-testid="select-sort">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="amount">Sort by Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load mix history. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p>Loading your mix history...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredHistory.length === 0 && (
        <Card className="border-purple-500/20">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No History Yet</h3>
            <p className="text-muted-foreground">Your completed mixes will appear here</p>
          </CardContent>
        </Card>
      )}

      {/* History List */}
      {!isLoading && !error && filteredHistory.length > 0 && (
        <div className="space-y-4">
          {filteredHistory.map((record) => (
            <Card key={record.id} className="border-purple-500/20 hover-elevate" data-testid={`record-${record.id}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">{record.walletPublicKey.slice(0, 8)}...{record.walletPublicKey.slice(-8)}</span>
                      {getStatusBadge(record.status)}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Created: {format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                    </CardDescription>
                    {record.completedAt && (
                      <CardDescription className="text-xs">
                        Completed: {format(new Date(record.completedAt), 'MMM dd, yyyy HH:mm:ss')}
                      </CardDescription>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{safeNum(record.solSent)} SOL</div>
                    {record.zecReceived && (
                      <div className="text-sm text-muted-foreground">→ {safeNum(record.zecReceived, 6)} ZEC</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                  <div>
                    <div className="text-muted-foreground mb-1">Gross Amount</div>
                    <div className="font-mono">{safeNum(record.grossAmount)} SOL</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Platform Fee</div>
                    <div className="font-mono">{safeNum(record.platformFee)} SOL</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Network Fees</div>
                    <div className="font-mono">{safeNum(record.networkFees, 6)} SOL</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Total Fees</div>
                    <div className="font-mono">{safeNum(record.totalFees)} SOL</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                  <div>
                    <div className="text-muted-foreground mb-1">Net Amount</div>
                    <div className="font-mono font-semibold text-primary">{safeNum(record.netAmount)} SOL</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Hops</div>
                    <div className="font-semibold">{record.hopCount}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1">Privacy Score</div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span className="font-semibold">{record.privacyScore ?? 'N/A'}</span>
                    </div>
                  </div>
                  {record.exchangeRate && (
                    <div>
                      <div className="text-muted-foreground mb-1">Exchange Rate</div>
                      <div className="font-mono">{safeNum(record.exchangeRate, 6)}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-3 border-t border-border/50">
                  {record.exchangeId && (
                    <div className="md:col-span-2">
                      <div className="text-muted-foreground mb-1">Exchange ID</div>
                      <code className="font-mono text-xs">{record.exchangeId}</code>
                    </div>
                  )}
                  {record.preset && (
                    <div>
                      <div className="text-muted-foreground mb-1">Preset</div>
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                        {record.preset}
                      </Badge>
                    </div>
                  )}
                </div>
                {record.payoutAddress && (
                  <div className="mt-3 pt-3 border-t border-border/50 text-xs">
                    <div className="text-muted-foreground mb-1">ZEC Payout Address</div>
                    <code className="font-mono text-xs">{record.payoutAddress}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function WalletCardSkeleton() {
  return (
    <Card className="glass-panel hover-elevate active-elevate-2 cursor-pointer">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-12 w-full" data-testid="skeleton-wallet-address" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function WalletGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <WalletCardSkeleton key={i} />
      ))}
    </div>
  );
}

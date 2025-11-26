import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, Map, Book, LogIn, Clock, Award, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/NotificationCenter';

export function Header() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Logged Out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'There was an error logging out',
        variant: 'destructive',
      });
    }
  };

  return (
    <header className="border-b border-purple-500/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1 -ml-2" data-testid="link-home">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              zmix
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {user && (
              <>
                <Link href="/history">
                  <button
                    className={`inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 ${location === '/history' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
                    data-testid="link-history"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    History
                  </button>
                </Link>
                <Link href="/loyalty">
                  <button
                    className={`inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 ${location === '/loyalty' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
                    data-testid="link-loyalty"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    Loyalty
                  </button>
                </Link>
                <Link href="/referral">
                  <button
                    className={`inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 ${location === '/referral' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
                    data-testid="link-referral"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Referral
                  </button>
                </Link>
              </>
            )}
            <Link href="/roadmap">
              <button
                className={`inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 ${location === '/roadmap' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
                data-testid="link-roadmap"
              >
                <Map className="h-4 w-4 mr-2" />
                Roadmap
              </button>
            </Link>
            <Link href="/docs">
              <button
                className={`inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md transition-colors hover-elevate active-elevate-2 ${location === '/docs' ? 'bg-purple-500/10 text-purple-400' : 'text-muted-foreground'}`}
                data-testid="link-docs"
              >
                <Book className="h-4 w-4 mr-2" />
                Docs
              </button>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && <NotificationCenter />}
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-sm text-muted-foreground" data-testid="text-username">
                {user.username}
              </span>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-logout"
                onClick={handleLogout}
                className="border-purple-500/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <button
                className="inline-flex items-center justify-center min-h-8 px-3 text-sm font-medium rounded-md border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 transition-colors hover-elevate active-elevate-2"
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Login
              </button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

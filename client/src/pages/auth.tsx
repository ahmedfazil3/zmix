import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, User } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';

export default function Auth() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(pin)) {
        toast({
          title: 'Invalid PIN',
          description: 'PIN must be 4-6 digits',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      await apiRequest('POST', endpoint, { username, password: pin });

      // Invalidate auth and wallet queries to refetch fresh data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });

      toast({
        title: isLogin ? 'Login Successful' : 'Account Created',
        description: `Welcome, ${username}`,
      });
      setLocation('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please try again.';
      toast({
        title: 'Authentication Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-blue-900/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />

      <Card className="w-full max-w-md relative z-10 border-purple-500/20 bg-background/95 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            zmix
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? 'Enter your credentials to continue' : 'Create your privacy account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                data-testid="input-username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="bg-background/50 border-purple-500/20 focus:border-purple-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                PIN (4-6 digits)
              </Label>
              <Input
                id="pin"
                data-testid="input-pin"
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="bg-background/50 border-purple-500/20 focus:border-purple-500/50 font-mono text-lg tracking-widest"
              />
            </div>

            <Button
              type="submit"
              data-testid="button-submit"
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                data-testid="button-toggle-mode"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPin('');
                }}
                className="text-purple-400 hover:text-purple-300"
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationService, type Notification } from '@/lib/notificationService';
import { formatDistance } from 'date-fns';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const loadNotifications = () => {
    const stored = notificationService.getStoredNotifications();
    setNotifications(stored);
    setUnreadCount(notificationService.getUnreadCount());
  };

  useEffect(() => {
    loadNotifications();

    const handleNewNotification = () => {
      loadNotifications();
    };

    const handleUpdate = () => {
      loadNotifications();
    };

    window.addEventListener('zmix-notification', handleNewNotification);
    window.addEventListener('zmix-notifications-updated', handleUpdate);

    return () => {
      window.removeEventListener('zmix-notification', handleNewNotification);
      window.removeEventListener('zmix-notifications-updated', handleUpdate);
    };
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-500/5';
      case 'error':
        return 'border-red-500/20 bg-red-500/5';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/5';
      default:
        return 'border-blue-500/20 bg-blue-500/5';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="button-notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleMarkAllRead}
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClearAll}
                data-testid="button-clear-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                We'll notify you when important events happen
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-all ${
                    notification.read ? 'opacity-60' : ''
                  } ${getNotificationColor(notification.type)} hover-elevate`}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-base mt-0.5 flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm mb-1">
                          {notification.title}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          {notification.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2">
                          {formatDistance(notification.timestamp, Date.now(), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMarkAsRead(notification.id)}
                          data-testid={`button-mark-read-${notification.id}`}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t border-border text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={handleClearAll}
              data-testid="button-clear-all-bottom"
            >
              Clear all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

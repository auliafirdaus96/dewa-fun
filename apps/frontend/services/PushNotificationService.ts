/**
 * Push Notification Service for DLMM Agent
 * Handles browser notifications and in-app toasts
 */

import toast, { Toast } from 'react-hot-toast';

export interface NotificationData {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // ms
}

class PushNotificationServiceClass {
  private permission: NotificationPermission = 'default';
  private queue: NotificationData[] = [];

  constructor() {
    this.checkPermission();
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.warn('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Check current notification permission
   */
  checkPermission(): boolean {
    if (!('Notification' in window)) {
      this.permission = 'denied';
      return false;
    }

    this.permission = Notification.permission;
    return this.permission === 'granted';
  }

  /**
   * Send success notification
   */
  success(title: string, message?: string, duration: number = 4000): void {
    this.send({
      type: 'success',
      title,
      message: message || '',
      duration
    });
  }

  /**
   * Send error notification
   */
  error(title: string, message?: string, duration: number = 6000): void {
    this.send({
      type: 'error',
      title,
      message: message || '',
      duration
    });
  }

  /**
   * Send warning notification
   */
  warning(title: string, message?: string, duration: number = 5000): void {
    this.send({
      type: 'warning',
      title,
      message: message || '',
      duration
    });
  }

  /**
   * Send info notification
   */
  info(title: string, message?: string, duration: number = 4000): void {
    this.send({
      type: 'info',
      title,
      message: message || '',
      duration
    });
  }

  /**
   * Send transaction confirmation notification
   */
  transactionConfirmation(
    actionType: string,
    details: any,
    onConfirm: () => void,
    onCancel: () => void
  ): void {
    const id = Date.now().toString();
    
    const toastElement = (t: Toast) => (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 max-w-md">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-xl">📝</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm mb-1">{actionType}</h4>
            <p className="text-zinc-400 text-xs">{details}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              toast.dismiss(id);
              onConfirm();
            }}
            className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-xs font-medium transition-all"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              toast.dismiss(id);
              onCancel();
            }}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );

    toast.custom(toastElement, {
      id,
      duration: 30000, // 30 seconds timeout
    });
  }

  /**
   * Send AI agent response notification
   */
  agentResponse(response: string, actions?: Array<{label: string; action: string}>): void {
    const id = Date.now().toString();
    
    const toastElement = (t: Toast) => (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 max-w-md">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-xl">🤖</span>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-bold text-sm mb-1">AI Assistant</h4>
            <p className="text-zinc-300 text-xs whitespace-pre-wrap line-clamp-4">{response}</p>
            
            {actions && actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      toast.dismiss(id);
                      // Handle action click
                      console.log('Action clicked:', action);
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-all"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    toast.custom(toastElement, {
      id,
      duration: 8000,
    });
  }

  /**
   * Send price alert notification
   */
  priceAlert(token: string, price: number, change: number): void {
    const isPositive = change >= 0;
    
    new Notification(`Price Alert: ${token}`, {
      body: `${token} is now $${price.toFixed(2)} (${isPositive ? '+' : ''}${change.toFixed(2)}%)`,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: `price-${token}`
    });
  }

  /**
   * Send rebalance complete notification
   */
  rebalanceComplete(poolAddress: string, oldRange: string, newRange: string): void {
    const notification = new Notification('Rebalance Complete ✅', {
      body: `Pool ${poolAddress.slice(0, 8)}... updated\nFrom: ${oldRange}\nTo: ${newRange}`,
      icon: '/logo.png',
      badge: '/badge.png',
      tag: 'rebalance-complete',
      requireInteraction: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private send(data: NotificationData): void {
    // Always show in-app toast
    const toastId = this.showToast(data);

    // Send browser notification if permitted
    if (this.permission === 'granted') {
      this.sendBrowserNotification(data);
    } else {
      // Queue for later if permission not granted
      this.queue.push(data);
    }
  }

  private showToast(data: NotificationData): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colors = {
      success: 'bg-emerald-600',
      error: 'bg-red-600',
      warning: 'bg-yellow-600',
      info: 'bg-blue-600'
    };

    const toastElement = (t: Toast) => (
      <div className={`${colors[data.type]} text-white px-4 py-3 rounded-xl shadow-lg max-w-md`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{icons[data.type]}</span>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">{data.title}</h4>
            {data.message && <p className="text-xs opacity-90">{data.message}</p>}
            {data.action && (
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  data.action?.onClick();
                }}
                className="mt-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium transition-all"
              >
                {data.action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    );

    return toast.custom(toastElement, {
      duration: data.duration,
    });
  }

  private sendBrowserNotification(data: NotificationData): void {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    new Notification(data.title, {
      body: data.message || '',
      icon: '/logo.png',
      badge: '/badge.png',
      tag: data.title.replace(/\s+/g, '-'),
      requireInteraction: data.type === 'error' || data.type === 'warning'
    });
  }

  /**
   * Process queued notifications (if permission was granted after initial denial)
   */
  processQueue(): void {
    if (this.permission === 'granted') {
      this.queue.forEach(data => this.send(data));
      this.queue = [];
    }
  }
}

// Singleton instance
export const pushNotificationService = new PushNotificationServiceClass();

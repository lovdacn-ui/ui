import { Icon } from '@preview/components/ui/icon';
import * as React from 'react';
import { Pressable, Text, View } from '@preview/components/ui/primitives';
import { cn } from '@preview/lib/utils';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { Portal } from '@rn-primitives/portal';
import { AccessibilityInfo } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import Animated, {
  FadeInUp,
  FadeOutUp,
  ReduceMotion,
} from 'react-native-reanimated';

type ToastType = 'success' | 'error' | 'info';

type ToastOptions = {
  description?: string;
  type?: ToastType;
  duration?: number;
};

type ToastData = Required<Pick<ToastOptions, 'type' | 'duration'>> & {
  id: string;
  title: string;
  description?: string;
};

type ToastContextValue = {
  toast: (title: string, options?: ToastOptions) => void;
};

type ToastProviderProps = {
  children: React.ReactNode;
  portal?: boolean;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

let toastId = 0;
const toastListeners = new Set<
  (title: string, options?: ToastOptions) => void
>();

const toast = {
  show(title: string, options?: ToastOptions) {
    toastListeners.forEach((listener) => listener(title, options));
  },
};

function ToastProvider({ children, portal = true }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = React.useCallback(
    (title: string, options: ToastOptions = {}) => {
      const nextToast: ToastData = {
        id: `toast-${++toastId}`,
        title,
        description: options.description,
        type: options.type ?? 'info',
        duration: options.duration ?? 4000,
      };

      setToasts((current) => [...current, nextToast].slice(-3));

      const announcement = options.description
        ? `${title}. ${options.description}`
        : title;
      AccessibilityInfo.announceForAccessibility(announcement);
    },
    []
  );

  React.useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    for (const item of toasts) {
      timers.set(
        item.id,
        setTimeout(() => removeToast(item.id), item.duration)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  React.useEffect(() => {
    const listener = (title: string, options?: ToastOptions) =>
      showToast(title, options);
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, [showToast]);

  const value = React.useMemo(() => ({ toast: showToast }), [showToast]);
  const viewport = (
    <ToastViewport toasts={toasts} onDismiss={removeToast} />
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {portal ? (
        <Portal name="lovdacn-toast-viewport">{viewport}</Portal>
      ) : (
        viewport
      )}
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const toastVariants = {
  success: {
    icon: CheckCircle2,
    iconClassName: 'text-green-600 dark:text-green-500',
  },
  error: {
    icon: AlertCircle,
    iconClassName: 'text-destructive',
  },
  info: {
    icon: Info,
    iconClassName: 'text-foreground',
  },
} as const;

function AnimatedToast({
  item,
  onDismiss,
}: {
  item: ToastData;
  onDismiss: (id: string) => void;
}) {
  const variant = toastVariants[item.type];
  const VariantIcon = variant.icon;

  return (
    <Animated.View
      entering={FadeInUp.reduceMotion(ReduceMotion.System)}
      exiting={FadeOutUp.reduceMotion(ReduceMotion.System)}
      style={{ width: '100%', maxWidth: 400 }}>
      <View
        accessibilityRole="alert"
        className={cn(
          'bg-background border-border pointer-events-auto w-full max-w-[400px] flex-row items-start gap-3 rounded-lg border p-4 shadow-md'
        )}>
        <Icon as={VariantIcon} size={20} className={variant.iconClassName} />
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-sm font-semibold">
            {item.title}
          </Text>
          {item.description ? (
            <Text className="text-muted-foreground text-sm">
              {item.description}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          onPress={() => onDismiss(item.id)}
          className="opacity-70 active:opacity-100">
          <Icon as={X} size={16} className="text-muted-foreground" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  const insets = React.useContext(SafeAreaInsetsContext);

  return (
    <View
      style={{
        top: Math.max(insets?.top ?? 0, 16),
        pointerEvents: 'box-none',
      }}
      className="absolute right-4 left-4 z-50 flex-col items-center gap-2">
      {toasts.map((item) => (
        <AnimatedToast key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

export { ToastProvider, useToast, toast };

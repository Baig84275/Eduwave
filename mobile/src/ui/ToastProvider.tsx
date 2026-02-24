import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { ToastItem, ToastData, ToastType } from "./Toast";
import { tokens } from "../theme/tokens";

// Default toast duration in ms
const DEFAULT_DURATION = 4000;

interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  hideToast: (id: string) => void;
  hideAll: () => void;
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const hideToast = useCallback((id: string) => {
    // Clear the timeout if it exists
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const hideAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions): string => {
      const id = `toast-${++toastIdCounter}`;
      const duration = options.duration ?? DEFAULT_DURATION;

      const newToast: ToastData = {
        id,
        type: options.type ?? "info",
        title: options.title,
        message: options.message,
        duration,
        action: options.action,
      };

      setToasts((prev) => {
        // Limit to 3 toasts max
        const limited = prev.length >= 3 ? prev.slice(1) : prev;
        return [...limited, newToast];
      });

      // Auto-dismiss after duration
      if (duration > 0) {
        const timeout = setTimeout(() => {
          hideToast(id);
        }, duration);
        timeoutRefs.current.set(id, timeout);
      }

      return id;
    },
    [hideToast]
  );

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string) => showToast({ type: "success", title, message }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => showToast({ type: "error", title, message }),
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => showToast({ type: "warning", title, message }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => showToast({ type: "info", title, message }),
    [showToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      hideToast,
      hideAll,
      success,
      error,
      warning,
      info,
    }),
    [showToast, hideToast, hideAll, success, error, warning, info]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container - renders above everything else */}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: tokens.zIndex.toast,
    gap: tokens.spacing.sm,
  },
});

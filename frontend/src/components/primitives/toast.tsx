"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, useContext, useRef, useState } from "react";

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed bottom-0 left-1/2 z-50 flex w-full max-w-mobile -translate-x-1/2 flex-col gap-2 p-4 outline-none",
        className,
      )}
      {...props}
    />
  );
}

interface ToastProps extends React.ComponentProps<typeof ToastPrimitive.Root> {
  stacked?: boolean;
}

function Toast({ className, stacked, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "flex gap-4 rounded-lg border border-foreground bg-background px-6 py-4 text-base",
        stacked ? "flex-col" : "items-center",
        className,
      )}
      {...props}
    />
  );
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("flex-1", className)}
      {...props}
    />
  );
}

function ToastFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="toast-footer"
      className={cn("flex items-center justify-end gap-6", className)}
      {...props}
    />
  );
}

function ToastAction({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      className={cn(
        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      <X aria-hidden className="size-6" />
    </ToastPrimitive.Close>
  );
}

interface ToastOptions {
  description: React.ReactNode;
  action?: { label: React.ReactNode; altText: string; onClick?: () => void };
  stacked?: boolean;
  duration?: number;
}

interface QueuedToast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(
  null,
);

function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextId = useRef(0);

  function toast(options: ToastOptions) {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...options, id }]);
  }

  function dismiss(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  return (
    <ToastContext value={toast}>
      <ToastPrimitive.Provider>
        {children}
        {toasts.map(({ id, description, action, stacked, duration }) => (
          <Toast
            key={id}
            stacked={stacked}
            duration={duration}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(id);
              }
            }}
          >
            <ToastDescription>{description}</ToastDescription>
            <ToastFooter>
              {action ? (
                <ToastAction altText={action.altText} onClick={action.onClick}>
                  {action.label}
                </ToastAction>
              ) : null}
              <ToastClose />
            </ToastFooter>
          </Toast>
        ))}
        <ToastViewport />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}

function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used inside <Toaster>");
  }
  return { toast };
}

export {
  Toaster,
  useToast,
  ToastViewport,
  Toast,
  ToastDescription,
  ToastFooter,
  ToastAction,
  ToastClose,
};
export type { ToastOptions };

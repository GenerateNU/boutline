"use client";

import { cn } from "cn";
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

function Toast({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(
        "flex items-center gap-3 rounded-lg bg-obsidian px-4 py-3 text-sm text-white shadow-md [&_svg]:size-5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function ToastDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <ToastPrimitive.Description asChild>
      <p
        data-slot="toast-description"
        className={cn("flex-1", className)}
        {...props}
      />
    </ToastPrimitive.Description>
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
        "cursor-pointer text-sm font-medium text-accent-green outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

interface ToastActionOptions {
  label: React.ReactNode;
  altText: string;
  onClick?: () => void;
}

interface ToastOptions {
  description: React.ReactNode;
  icon?: React.ReactNode;
  action?: ToastActionOptions;
  duration?: number;
}

interface QueuedToast extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((options: ToastOptions) => void) | null>(
  null,
);

interface ToasterProps {
  children: React.ReactNode;
}

function Toaster({ children }: ToasterProps) {
  const [toasts, setToasts] = useState<QueuedToast[]>([]);
  const nextId = useRef(0);

  function toast(options: ToastOptions) {
    const id = nextId.current++;
    setToasts((current) => [...current, { ...options, id }]);
  }

  function dismiss(id: number) {
    setToasts((current) => current.filter((queued) => queued.id !== id));
  }

  return (
    <ToastContext value={toast}>
      <ToastPrimitive.Provider>
        {children}
        {toasts.map(({ id, description, icon, action, duration }) => (
          <Toast
            key={id}
            duration={duration}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(id);
              }
            }}
          >
            {icon}
            <ToastDescription>{description}</ToastDescription>
            {action && (
              <ToastAction altText={action.altText} onClick={action.onClick}>
                {action.label}
              </ToastAction>
            )}
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

export { Toaster, useToast, type ToastOptions };

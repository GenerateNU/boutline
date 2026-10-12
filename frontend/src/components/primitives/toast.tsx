"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";

const ToastProvider = ToastPrimitive.Provider;

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

type ToastProps = React.ComponentProps<typeof ToastPrimitive.Root> & {
  stacked?: boolean;
};

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

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastDescription,
  ToastFooter,
  ToastAction,
  ToastClose,
};

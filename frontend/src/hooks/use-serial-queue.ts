import { useEffect, useRef, useState } from "react";

interface SerialQueueOptions<T> {
  send: (item: T) => Promise<void>;
  onFailure: (caught: unknown) => Promise<void>;
}

// Items are queued rather than blocked while one is in flight, so callers can update
// the screen right away, even on a slow connection. They're sent one at a time, in
// order, so each request sees the state the one before it left behind.
export function useSerialQueue<T>({ send, onFailure }: SerialQueueOptions<T>) {
  const [pending, setPending] = useState<T[]>([]);
  const queue = useRef<T[]>([]);
  const sending = useRef(false);
  // The loop outlives the render that started it, so it reads the latest handlers.
  const handlers = useRef({ send, onFailure });
  useEffect(() => {
    handlers.current = { send, onFailure };
  });

  async function sendQueued() {
    sending.current = true;
    while (queue.current.length > 0) {
      try {
        await handlers.current.send(queue.current[0]);
        queue.current = queue.current.slice(1);
        setPending(queue.current);
      } catch (caught) {
        // The rest were queued against a state the server never reached.
        queue.current = [];
        setPending([]);
        await recover(caught);
      }
    }
    sending.current = false;
  }

  // A throwing onFailure must not stop the loop, or the queue would stay busy forever.
  async function recover(caught: unknown) {
    try {
      await handlers.current.onFailure(caught);
    } catch (recoveryError) {
      console.error(recoveryError);
    }
  }

  function enqueue(item: T) {
    queue.current = [...queue.current, item];
    setPending(queue.current);
    if (!sending.current) {
      sendQueued();
    }
  }

  return { pending, enqueue };
}

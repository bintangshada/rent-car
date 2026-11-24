import { getCurrentUser } from "@/lib/auth";
import { getEventBus, AppEvent } from "@/lib/events";
import { ensureBridgeStarted } from "@/lib/mqtt-bridge";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return new Response("Unauthorized", { status: 401 });
  }

  await ensureBridgeStarted();
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: AppEvent | { type: "connected" }) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const listener = (event: AppEvent) => send(event);
      getEventBus().on("app", listener);
      send({ type: "connected" });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keep-alive\n\n"));
        } catch {
          cleanup();
        }
      }, 20_000);

      cleanup = () => {
        clearInterval(heartbeat);
        getEventBus().off("app", listener);
        try {
          controller.close();
        } catch {
          // Stream already closed by the client.
        }
      };

      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

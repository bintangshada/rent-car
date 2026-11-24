import { EventEmitter } from "node:events";

export type AppEvent =
  | { type: "telemetry"; vehicleId: string }
  | { type: "command"; vehicleId: string }
  | { type: "vehicles" }
  | { type: "status" };

const globalForBus = globalThis as unknown as { appEventBus?: EventEmitter };

export function getEventBus(): EventEmitter {
  if (!globalForBus.appEventBus) {
    const bus = new EventEmitter();
    bus.setMaxListeners(100);
    globalForBus.appEventBus = bus;
  }
  return globalForBus.appEventBus;
}

export function emitAppEvent(event: AppEvent): void {
  getEventBus().emit("app", event);
}

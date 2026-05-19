const STORAGE_PREFIX = "otm:workflow-signal:";
const EVENT_PREFIX = "otm-workflow:";

export type WorkflowSignal = "invoice-dc-pending-refresh";

function getStorageKey(signal: WorkflowSignal) {
  return `${STORAGE_PREFIX}${signal}`;
}

function getEventName(signal: WorkflowSignal) {
  return `${EVENT_PREFIX}${signal}`;
}

export function emitWorkflowSignal(signal: WorkflowSignal) {
  if (typeof window === "undefined") return;

  const stamp = String(Date.now());

  try {
    window.localStorage.setItem(getStorageKey(signal), stamp);
  } catch {
    // Ignore storage write failures and still emit the in-tab event.
  }

  window.dispatchEvent(new CustomEvent(getEventName(signal), { detail: stamp }));
}

export function subscribeWorkflowSignal(signal: WorkflowSignal, callback: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const storageKey = getStorageKey(signal);
  const eventName = getEventName(signal);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) callback();
  };
  const handleEvent: EventListener = () => {
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(eventName, handleEvent);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(eventName, handleEvent);
  };
}

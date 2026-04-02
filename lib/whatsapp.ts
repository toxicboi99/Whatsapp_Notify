import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import qrcode from "qrcode-terminal";
import { Client, LocalAuth } from "whatsapp-web.js";

type WhatsAppStatus =
  | "idle"
  | "starting"
  | "recovering"
  | "qr"
  | "authenticated"
  | "ready"
  | "auth_failure"
  | "disconnected"
  | "error";

type WhatsAppStore = {
  client: Client | null;
  initializing: Promise<void> | null;
  ready: boolean;
  status: WhatsAppStatus;
};

declare global {
  var __whatsappStore__: WhatsAppStore | undefined;
}

type InternalClient = Client & {
  destroy: () => Promise<void>;
  pupBrowser?: {
    isConnected?: () => boolean;
  } | null;
  pupPage?: {
    evaluate: <T>(
      pageFunction: () => T | Promise<T>
    ) => Promise<T>;
    isClosed?: () => boolean;
  } | null;
};

type ClientProbe = {
  appState: string | null;
  browserConnected: boolean;
  client: Client | null;
  hasStore: boolean;
  hasWWebJS: boolean;
  pageClosed: boolean;
  ready: boolean;
  recoverable: boolean;
  status: WhatsAppStatus;
};

const statusFilePath = path.join(process.cwd(), ".whatsapp-status");

const store =
  globalThis.__whatsappStore__ ??
  (globalThis.__whatsappStore__ = {
    client: null,
    initializing: null,
    ready: false,
    status: "idle",
  });

async function persistStatus(status: WhatsAppStatus) {
  store.status = status;

  try {
    await writeFile(statusFilePath, status, "utf8");
  } catch (error) {
    console.error("Failed to update WhatsApp status file:", error);
  }
}

function setReady(ready: boolean, status: WhatsAppStatus) {
  store.ready = ready;
  void persistStatus(status);
}

async function destroyClient() {
  const currentClient = store.client as InternalClient | null;
  store.client = null;
  store.ready = false;

  if (!currentClient) {
    return;
  }

  try {
    await currentClient.destroy();
  } catch (error) {
    console.error("Failed to destroy WhatsApp client:", error);
  }
}

async function probeClient(client: Client | null): Promise<ClientProbe> {
  const internalClient = client as InternalClient | null;
  const browserConnected = internalClient?.pupBrowser?.isConnected?.() ?? false;
  const pageClosed = internalClient?.pupPage?.isClosed?.() ?? true;

  let hasStore = false;
  let hasWWebJS = false;
  let appState: string | null = null;

  if (browserConnected && !pageClosed && internalClient?.pupPage) {
    try {
      const runtimeState = await internalClient.pupPage.evaluate(() => ({
        ...(() => {
          const whatsAppWindow = window as Window & {
            Store?: {
              AppState?: {
                state?: string;
              };
            };
            WWebJS?: unknown;
          };

          return {
            appState: whatsAppWindow.Store?.AppState?.state ?? null,
            hasStore: typeof whatsAppWindow.Store !== "undefined",
            hasWWebJS: typeof whatsAppWindow.WWebJS !== "undefined",
          };
        })(),
      }));

      appState = runtimeState.appState;
      hasStore = runtimeState.hasStore;
      hasWWebJS = runtimeState.hasWWebJS;
    } catch (error) {
      console.error("Failed to probe WhatsApp page state:", error);
    }
  }

  const ready =
    store.ready &&
    client !== null &&
    browserConnected &&
    !pageClosed &&
    hasStore &&
    hasWWebJS &&
    appState === "CONNECTED";

  const recoverable = client !== null && browserConnected && !pageClosed;

  let status = store.status;
  if (!client) {
    status = "starting";
  } else if (ready) {
    status = "ready";
  } else if (recoverable) {
    status = hasWWebJS ? "starting" : "recovering";
  } else {
    status = "disconnected";
  }

  return {
    appState,
    browserConnected,
    client,
    hasStore,
    hasWWebJS,
    pageClosed,
    ready,
    recoverable,
    status,
  };
}

export async function ensureWhatsAppInitialized() {
  if (store.initializing) {
    return store.initializing;
  }

  if (store.client) {
    return;
  }

  store.initializing = (async () => {
    await persistStatus("starting");

    console.log("\n");
    console.log("WhatsApp Client Starting...\n");

    try {
      const nextClient = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
        },
      });

      store.client = nextClient;

      nextClient.on("qr", (qr: string) => {
        setReady(false, "qr");
        console.log("\n");
        console.log("==========================================");
        console.log("SCAN THIS QR CODE WITH YOUR WHATSAPP");
        console.log("==========================================\n");
        qrcode.generate(qr, { small: true });
        console.log("\n==========================================");
        console.log("Steps:");
        console.log("1. Open WhatsApp on your phone");
        console.log("2. Settings > Linked Devices > Link Device");
        console.log("3. Scan the QR code above");
        console.log("==========================================\n");
      });

      nextClient.on("authenticated", () => {
        void persistStatus("authenticated");
        console.log("WhatsApp Authenticated!\n");
      });

      nextClient.on("auth_failure", (message: string) => {
        console.error("Auth Failed:", message, "\n");
        setReady(false, "auth_failure");
      });

      nextClient.on("ready", () => {
        setReady(true, "ready");
        console.log("WhatsApp Ready! Open http://localhost:3000\n");
      });

      nextClient.on("disconnected", (reason: string) => {
        console.log("WhatsApp Disconnected:", reason, "\n");
        setReady(false, "disconnected");
      });

      nextClient.on("error", (error: unknown) => {
        console.error("WhatsApp Error Event:", error);
        setReady(false, "error");
      });

      nextClient.on("message", (message: { from: string; body: string }) => {
        console.log(`New message from ${message.from}: ${message.body}`);
      });

      console.log("Initializing WhatsApp (may take 1-2 minutes)...\n");
      await nextClient.initialize();
    } catch (error) {
      console.error("WhatsApp Initialization Error:", error);
      store.client = null;
      setReady(false, "error");
    } finally {
      store.initializing = null;
    }
  })();

  return store.initializing;
}

export function getWhatsAppState() {
  return {
    client: store.client,
    initializing: store.initializing !== null,
    ready: store.ready && store.client !== null,
    status: store.status,
  };
}

export async function getPersistedWhatsAppStatus() {
  try {
    return (await readFile(statusFilePath, "utf8")).trim() as WhatsAppStatus;
  } catch {
    return store.status;
  }
}

export async function getWhatsAppHealth() {
  const probe = await probeClient(store.client);

  if (!probe.ready && store.ready) {
    store.ready = false;
    await persistStatus(probe.status);
  }

  return probe;
}

export async function recoverWhatsAppClient() {
  if (store.initializing) {
    return store.initializing;
  }

  await persistStatus("recovering");
  await destroyClient();
  return ensureWhatsAppInitialized();
}

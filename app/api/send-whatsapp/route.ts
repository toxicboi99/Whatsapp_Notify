import { NextRequest, NextResponse } from "next/server";

import {
  ensureWhatsAppInitialized,
  getWhatsAppHealth,
  getPersistedWhatsAppStatus,
  recoverWhatsAppClient,
} from "@/lib/whatsapp";

export const runtime = "nodejs";

function isRecoverableSendError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("reading 'getChat'") ||
    error.message.includes('reading "getChat"') ||
    error.message.includes("window.WWebJS") ||
    error.message.includes("Execution context was destroyed") ||
    error.message.includes("Cannot find context with specified id")
  );
}

export async function POST(request: NextRequest) {
  try {
    void ensureWhatsAppInitialized();

    const { name, phone } = await request.json();

    console.log(`\nReceived request - Name: ${name}, Phone: ${phone}`);

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    console.log(`Cleaned phone: ${cleanPhone}`);

    const isValid = /^(\+91\d{10}|\+977\d{9,10}|\d{10,15})$/.test(cleanPhone);

    if (!isValid) {
      console.log(`Invalid phone format: ${cleanPhone}`);
      return NextResponse.json(
        { error: "Use +91 (10 digits) or +977 (9-10 digits)" },
        { status: 400 }
      );
    }

    const { client, ready, status, appState, hasStore, hasWWebJS } =
      await getWhatsAppHealth();

    console.log(
      `Client ready status: ${ready} (${status}) | appState: ${appState} | store: ${hasStore} | wwebjs: ${hasWWebJS}`
    );
    if (!ready || !client) {
      if (client && (!hasWWebJS || appState !== "CONNECTED")) {
        void recoverWhatsAppClient();
      }

      console.error("WhatsApp not ready!");
      return NextResponse.json(
        {
          error: `WhatsApp not ready yet (status: ${status}). Check server terminal for QR code or wait for the Ready message.`,
        },
        { status: 503 }
      );
    }

    let formatted = cleanPhone;

    if (formatted.startsWith("+")) {
      formatted = formatted.substring(1);
    }

    if (!formatted.startsWith("91") && !formatted.startsWith("977")) {
      if (
        formatted.length === 10 &&
        (cleanPhone.includes("91") || cleanPhone.includes("+91"))
      ) {
        formatted = "91" + formatted;
      } else if (formatted.length === 10) {
        formatted = "91" + formatted;
      } else if (formatted.length === 9 || formatted.length === 10) {
        formatted = "977" + formatted;
      }
    }

    const chatId = `${formatted}@c.us`;
    console.log(`Formatted WhatsApp ID: ${chatId}`);

    try {
      const registeredNumber = await client.getNumberId(chatId);
      if (!registeredNumber) {
        return NextResponse.json(
          {
            error: "This number is not registered on WhatsApp.",
          },
          { status: 400 }
        );
      }

      const message = "You Successfully submitted form";
      console.log(`Sending message to ${chatId}...`);

      await client.sendMessage(chatId, message);
      console.log(`Message sent to: ${phone} (${chatId})`);

      return NextResponse.json({
        success: true,
        message: "Message sent successfully!",
      });
    } catch (sendError) {
      console.error(`Failed to send to ${chatId}:`, sendError);

      if (isRecoverableSendError(sendError)) {
        void recoverWhatsAppClient();
        return NextResponse.json(
          {
            error:
              "WhatsApp session lost its browser bridge and is reconnecting. Please wait a few seconds, confirm the session is ready again, and retry.",
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: `Failed to send message: ${sendError instanceof Error ? sendError.message : "Unknown error"}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  void ensureWhatsAppInitialized();

  const { ready, status } = await getWhatsAppHealth();
  const persistedStatus = await getPersistedWhatsAppStatus();

  console.log(`Status check - Ready: ${ready}, Status: ${status}`);

  return NextResponse.json({
    ready,
    status: ready ? status : persistedStatus,
    message: ready
      ? "WhatsApp connected and ready"
      : "Initializing... Check server output for QR code. This can take 1-2 minutes.",
  });
}

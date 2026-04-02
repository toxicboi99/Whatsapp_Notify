export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureWhatsAppInitialized } = await import("@/lib/whatsapp");

    // Don't await - let it initialize in the background during server startup.
    ensureWhatsAppInitialized().catch((error) => {
      console.error("Failed to initialize WhatsApp:", error);
    });
  }
}

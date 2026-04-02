# WhatsApp Form Submission

Send WhatsApp messages on form submission using your own WhatsApp account.

## Quick Setup

### 1. Install Dependencies
```bash
cd "c:\Users\DELL\Desktop\sucess mesage"
npm install
```

### 2. Start the Application

**Windows (Easiest):**
- Double-click `start.bat` file

**Or manually:**
```bash
npm run dev
```

### 3. Wait for QR Code

You'll see in the terminal output:

```
🚀 WhatsApp Client Initializing...

⏳ Initializing (may take 1-2 minutes)...

==========================================
📱 SCAN THIS QR CODE WITH YOUR WHATSAPP
==========================================
████████████████████
██  ▄▄▄▄▄  █ ▄▄▄▄▄ ██
... (QR code)
==========================================
```

### 4. Scan the QR Code

1. Open **WhatsApp on your phone**
2. Go to **Settings → Linked Devices → Link Device**
3. **Point your camera at the QR code** in the terminal
4. Wait for terminal to show:
```
✅ WhatsApp Authenticated!
🟢 WhatsApp Ready! Form is now active.
```

### 5. Use the Form

Open **http://localhost:3000** and:
1. Enter your name
2. Enter a WhatsApp number (+91 India, +977 Nepal)
3. Click Submit
4. **Message is sent FROM YOUR WHATSAPP** to that person! ✅

## How It Works

- Everything runs in **Next.js only**
- WhatsApp client initializes automatically
- QR code appears in **server terminal output**
- When form submitted, message sent from YOUR number to user's number
- NO separate Node servers needed

## Reset/Reconnect

To disconnect and scan a new QR code:

```bash
# Stop the server (Ctrl + C)

# Delete session
rmdir /s .wwebjs_auth

# Start again
npm run dev
```

## Form Details

- **Supports**: India (+91, 10 digits) and Nepal (+977, 9-10 digits)
- **Message**: "You Successfully submitted form"
- **Sends from**: Your WhatsApp account

## Ports

- Next.js Server: http://localhost:3000
- Requires internet connection

## Troubleshooting

### QR Code not showing?
- Wait 2-3 minutes after running `npm run dev`
- The terminal needs to fully initialize Chromium
- Watch for message: "🚀 WhatsApp Client Initializing"

### WhatsApp says "Not connected"?
- Make sure you scanned the complete QR code
- Wait for the green "🟢 Ready" message
- Then refresh http://localhost:3000

### Message not sending?
- Check your internet connection
- Make sure WhatsApp shows 🟢 Ready status
- Use correct format: +91 9876543210 (India) or +977 9841234567 (Nepal)

## License

MIT

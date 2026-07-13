# WhatsApp Cloud API integration

This portal connects to Meta's **WhatsApp Cloud API** to send and receive
messages on a business-owned WhatsApp number. This is the "single number" stage
described in the project plan — multi-tenant Embedded Signup comes later.

## What's included

| Piece | Path |
| --- | --- |
| Cloud API client (send text/template, mark-read, webhook types) | `src/lib/whatsapp.ts` |
| Webhook (verification + incoming messages + auto-reply) | `src/app/api/whatsapp/webhook/route.ts` |
| Send endpoint (text + template) | `src/app/api/whatsapp/send/route.ts` |
| Environment template | `.env.example` |

## 1. Configure credentials

Copy `.env.example` to `.env.local` and fill in the values from your Meta App
and WhatsApp Manager:

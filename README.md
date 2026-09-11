# Healthcare EDI ANSI X12 Parser (837P / 835 / 271) — TypeScript / JavaScript SDK

[![npm version](https://img.shields.io/npm/v/@stanzaapi/x12-parser.svg)](https://www.npmjs.com/package/@stanzaapi/x12-parser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stanza API](https://img.shields.io/badge/Powered%20by-Stanza-blue)](https://stanzaapi.com)

> Zero-regex parser converting raw Healthcare ANSI X12 EDI text into strongly-typed hierarchical JSON with client-side HIPAA DLP guardrails.

Official, zero-dependency Node.js and TypeScript client for **Healthcare EDI ANSI X12 Parser (837P / 835 / 271)**, powered by the [Stanza Micro-API Network](https://stanzaapi.com). Delivers deterministic, sub-5ms V8 isolate execution directly to your application without 3rd-party proxies.

* 🌐 **Live Web Sandbox:** [Try interactive queries online](https://stanzaapi.com/tools/x12-parser)
* 📚 **API Reference:** [Read complete OpenAPI specification](https://stanzaapi.com/tools/x12-parser)
* ⚡ **Platform Overview:** [Discover the Stanza Edge Portfolio](https://stanzaapi.com)

---

## 📦 Installation

```bash
npm install @stanzaapi/x12-parser
# or
pnpm add @stanzaapi/x12-parser
# or
yarn add @stanzaapi/x12-parser
```

---

## 🚀 Quickstart

```typescript
import { X12ParserClient } from '@stanzaapi/x12-parser';

// Initialize client (API key optional for sandbox tier evaluation)
const client = new X12ParserClient({
  apiKey: process.env.STANZA_API_KEY,
});

async function main() {
  const result = await client.parse('ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *230915*1000*^*00501*000000001*0*T*:~GS*HC*SUBMITTER*RECEIVER*20230915*1000*1*X*005010X222A1~ST*837*0001*005010X222A1~BHT*0019*00*CLAIM001*20230915*1000*CH~NM1*41*2*SUBMITTER*****46*123456789~PER*IC*EDI DEPT*TE*8005551212~NM1*40*2*RECEIVER*****46*987654321~HL*1**20*1~PRV*BI*PXC*207Q00000X~NM1*85*2*CLINIC*****XX*1999999999~HL*2*1*22*0~NM1*IL*1*SYNTHETIC*PATIENT****MI*SYN123456~CLM*CLM001*150.00***11:B:1*Y*A*Y*Y~HI*BK:J0100~LX*1~SV1*HC:99213*150.00*UN*1***1~DTP*472*D8*20230910~SE*15*0001~GE*1*1~IEA*1*000000001~');

  if (result.success) {
    console.log('Verification Success:', result.data);
  } else {
    console.error('Validation Error:', result.error, result.code);
  }
}

main().catch(console.error);
```

---

## 📄 Example JSON Response

```json
{
  "success": true,
  "data": {
    "transaction_type": "837P",
    "control_number": "0001",
    "total_charge": 150,
    "patient": {
      "last_name": "SYNTHETIC",
      "first_name": "PATIENT"
    },
    "claims": [
      {
        "claim_id": "CLM001",
        "amount": 150,
        "service_lines": [
          {
            "code": "99213",
            "charge": 150
          }
        ]
      }
    ]
  }
}
```

---

## ⚙️ Client Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiKey` | `string` | `process.env.STANZA_API_KEY` | Your [Stanza API Key](https://stanzaapi.com). Required for high-throughput production tiers. |
| `baseUrl` | `string` | `https://api.stanzaapi.com/x12-parser` | Public edge API base URL. Enterprise tier defaults to `https://secure.api.stanzaapi.com` (AWS BAA secure plane, DNS-only/unproxied). |
| `timeoutMs` | `number` | `15000` | Request timeout in milliseconds (uses native `AbortSignal.timeout`). |
| `tier` | `'sandbox' \| 'pro' \| 'enterprise'` | `'sandbox'` | Compliance routing tier. Set to `'enterprise'` under an executed BAA. |

---

## 🔒 Client-Side HIPAA Safe Harbor DLP Guardrail

This SDK includes an integrated client-side **Data Loss Prevention (DLP) scanner** that inspects payloads locally in memory before network transmission:

* **Non-BAA Tiers (`sandbox` / `pro`):** If live patient identifiers (unmasked 9-digit SSNs on `REF*SY` or real patient names on `NM1*QC`) are detected, **the request is aborted client-side** and throws `PhiDetectionGuardrailError`. Zero patient bytes ever leave your environment.
* **Enterprise Tier (`enterprise`):** Routes directly to the **AWS HIPAA BAA Backplane** at `https://secure.api.stanzaapi.com` (DNS-only, never proxied through Cloudflare) under an executed Business Associate Agreement.

```typescript
import { X12ParserClient, PhiDetectionGuardrailError } from '@stanzaapi/x12-parser';

try {
  const result = await client.parse(rawEdi);
} catch (err) {
  if (err instanceof PhiDetectionGuardrailError) {
    console.error('Blocked client-side HIPAA violation:', err.message);
  }
}
```

---

## 🛡️ Response Envelope & Error Handling

All responses return a typed envelope:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
}
```

---

## 🔗 Related Resources

* [Healthcare EDI ANSI X12 Parser (837P / 835 / 271) Interactive Playground](https://stanzaapi.com/tools/x12-parser)
* [Stanza Microservices Directory](https://stanzaapi.com)
* [Report an Issue on GitHub](https://github.com/StanzaAPI/x12-parser-typescript/issues)

## 📄 License

MIT © Stanza — Powered by [Stanza](https://stanzaapi.com).

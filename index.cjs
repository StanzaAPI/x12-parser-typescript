"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X12ParserClient = void 0;
exports.PhiDetectionGuardrailError = void 0;


class PhiDetectionGuardrailError extends Error {
  constructor(message, violationDetails = {}) {
    super(message);
    this.name = 'PhiDetectionGuardrailError';
    this.violationDetails = violationDetails;
  }
}

/**
 * HIPAA Safe Harbor 45 CFR § 164.514 Client-Side Pre-Flight Scanner.
 * Aborts request locally if live patient identifiers are detected on non-BAA tiers.
 */
function assertNoLivePhi(payload, tier = 'sandbox') {
  if (tier === 'enterprise') {
    return; // Enterprise BAA tier routes directly to dedicated AWS HIPAA enclave
  }

  const syntheticMarkers = ['TEST', 'SAMPLE', 'SYNTHETIC', 'DOE', 'TRAINING', 'MOCK', 'DEMO', 'SIMPSON', 'FLANDERS'];
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload);

  // 1. Social Security Number Check (REF*SY*9-digits)
  const ssnMatch = /REF\*SY\*(\d{3}-?\d{2}-?\d{4})/i.exec(text);
  if (ssnMatch && ssnMatch[1] !== '000000000' && ssnMatch[1] !== '123456789') {
    throw new PhiDetectionGuardrailError(
      `[HIPAA Safe Harbor 45 CFR § 164.514 Violation Blocked Client-Side]\n` +
      `Live Social Security Number detected in payload (REF*SY*${ssnMatch[1].slice(0, 3)}*****).\n` +
      `Your current SDK configuration ('${tier}' tier) is strictly restricted to de-identified synthetic data.\n` +
      `The SDK aborted this request locally before transmission to prevent an unencrypted HIPAA breach.\n\n` +
      `To process live patient records with an executed Business Associate Agreement (BAA):\n` +
      `1. Upgrade to the Enterprise AWS BAA Tier at https://stanzaapi.com/tools/x12-parser\n` +
          `2. Set config.tier = 'enterprise' to route to https://secure.api.stanzaapi.com (AWS BAA secure plane, never proxied through Cloudflare).`,
      { identifier: 'SSN', segment: 'REF*SY', upgrade_url: 'https://stanzaapi.com/tools/x12-parser' }
    );
  }

  // 2. Patient / Subscriber Name Check (NM1*QC or NM1*IL without synthetic markers)
  const nm1Matches = text.match(/NM1\*(QC|IL)\*1\*([^*~]+)\*([^*~]+)/g);
  if (nm1Matches) {
    for (const match of nm1Matches) {
      const parts = match.split('*');
      const lastName = (parts[3] || '').toUpperCase();
      const firstName = (parts[4] || '').toUpperCase();
      const isSynthetic = syntheticMarkers.some(m => lastName.includes(m) || firstName.includes(m));

      if (!isSynthetic && lastName.length > 2 && firstName.length > 2) {
        throw new PhiDetectionGuardrailError(
          `[HIPAA Safe Harbor 45 CFR § 164.514 Violation Blocked Client-Side]\n` +
          `Live patient name '${lastName}, ${firstName}' detected in EDI stream without synthetic test markers.\n` +
          `Your current SDK configuration ('${tier}' tier) is restricted to de-identified synthetic test data.\n` +
          `The SDK aborted this request locally before transmission to prevent an unencrypted HIPAA breach.\n\n` +
          `To process live electronic Protected Health Information (ePHI) with an executed BAA:\n` +
          `1. Upgrade to the Enterprise AWS BAA Tier at https://stanzaapi.com/tools/x12-parser\n` +
      `2. Set config.tier = 'enterprise' to route to https://secure.api.stanzaapi.com (AWS BAA secure plane, never proxied through Cloudflare).`,
          { identifier: 'PATIENT_NAME', segment: 'NM1', name: `${lastName}, ${firstName}`, upgrade_url: 'https://stanzaapi.com/tools/x12-parser' }
        );
      }
    }
  }
}

exports.PhiDetectionGuardrailError = PhiDetectionGuardrailError;

class X12ParserClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env?.STANZA_API_KEY || process.env?.API_KEY || '' : '');
    this.timeoutMs = config.timeoutMs || 15000;
    this.tier = config.tier || 'sandbox';
    this.baseUrl = config.baseUrl || (this.tier === 'enterprise' ? 'https://secure.api.stanzaapi.com' : 'https://api.stanzaapi.com/x12-parser');
    this.validateEndpoint = (this.tier === 'enterprise' ? '/v1/x12/validate' : '/api/v1/x12/validate');
    this.parseEndpoint = (this.tier === 'enterprise' ? '/v1/x12/parse' : '/api/v1/x12/parse');
    this.toolUrl = 'https://stanzaapi.com/tools/x12-parser';
  }

  async request(endpoint, options = {}) {
    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = endpoint.replace(/^\/+/, '');
    const url = `${cleanBase}/${cleanPath}`;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(this.apiKey ? { 'x-api-key': this.apiKey, 'Authorization': `Bearer ${this.apiKey}` } : {}),
      ...(options.headers || {})
    };

    let signal = options.signal;
    if (!signal && typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      signal = AbortSignal.timeout(this.timeoutMs);
    }

    try {
      const response = await fetch(url, { ...options, headers, signal });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText || text.slice(0, 180)}`,
          code: response.status === 429 ? 'RATE_LIMITED' : response.status === 413 ? 'PAYLOAD_TOO_LARGE' : 'HTTP_ERROR',
        };
      }
      if (typeof data === 'object' && data !== null) {
        data.tool_url = data.tool_url || this.toolUrl;
        data.upgrade_url = data.upgrade_url || this.toolUrl;
      }
      return data;
    } catch (err) {
      const isTimeout = err?.name === 'TimeoutError';
      return {
        success: false,
        error: isTimeout ? `Request timed out after ${this.timeoutMs}ms` : (err?.message || 'Network request failed'),
        code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
        tool_url: this.toolUrl,
        upgrade_url: this.toolUrl
      };
    }
  }

  async getHealth() {
    return this.request('/health', { method: 'GET' });
  }

  async validate(payload) {
    assertNoLivePhi(typeof payload === 'string' ? payload : JSON.stringify(payload), this.tier);
    const body = typeof payload === 'string' ? JSON.stringify({ edi: payload }) : JSON.stringify(payload);
    return this.request(this.validateEndpoint, {
      method: 'POST',
      body
    });
  }

  async parse(payload) {
    assertNoLivePhi(typeof payload === 'string' ? payload : JSON.stringify(payload), this.tier);
    const body = typeof payload === 'string' ? JSON.stringify({ edi: payload }) : JSON.stringify(payload);
    return this.request(this.parseEndpoint, {
      method: 'POST',
      body
    });
  }
}

exports.X12ParserClient = X12ParserClient;
exports.default = X12ParserClient;

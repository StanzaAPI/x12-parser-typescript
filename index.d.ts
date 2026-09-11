export interface ClientConfig {
  /**
   * Stanza API Key ('x-api-key').
   * Required for authenticated production access.
   */
  apiKey?: string;
  /**
   * Endpoint base URL. Defaults to 'https://api.stanzaapi.com/x12-parser'. Enterprise tier defaults to 'https://secure.api.stanzaapi.com' (AWS BAA secure plane).
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds. Defaults to 15,000 (15 seconds).
   */
  timeoutMs?: number;
  /**
   * Compliance Tier: 'sandbox' | 'pro' | 'enterprise'.
   * 'enterprise' connects to dedicated AWS BAA enclave and permits live ePHI.
   * Defaults to 'sandbox'.
   */
  tier?: 'sandbox' | 'pro' | 'enterprise';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  tool_url?: string;
  upgrade_url?: string;
  meta?: {
    latency_ms: number;
    version: string;
  };
}

export declare class PhiDetectionGuardrailError extends Error {
  readonly violationDetails?: Record<string, any>;
}

export declare class X12ParserClient {
  constructor(config?: ClientConfig);
  request<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>>;
  getHealth(): Promise<ApiResponse<{ status: string; timestamp: string }>>;
  validate<T = any>(payload: Record<string, any> | string): Promise<ApiResponse<T>>;
  parse<T = any>(payload: Record<string, any> | string): Promise<ApiResponse<T>>;
}

export default X12ParserClient;

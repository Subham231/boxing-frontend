/**
 * Central API client for the SPARAI production backend.
 * Base URL is read from process.env.NEXT_PUBLIC_API_URL.
 */

const DEFAULT_DEV_URL = 'http://localhost:8080';

export const API_BASE_URL: string = (
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_DEV_URL
).replace(/\/$/, '');

function resolveUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalized}`;
}

export async function apiFetch<T = unknown>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(resolveUrl(path), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API ${response.status}: ${body || response.statusText}`);
    }

    return response.json() as Promise<T>;
}

export async function checkBackendHealth(): Promise<{ status: string }> {
    return apiFetch<{ status: string }>('/health');
}

export interface SessionAnalysis {
    analysis: {
        feedback: string;
        tip: string;
        score: number;
    };
}

export async function analyzeSession(metrics: Record<string, unknown>): Promise<SessionAnalysis> {
    return apiFetch<SessionAnalysis>('/api/analyze-session', {
        method: 'POST',
        body: JSON.stringify({ metrics }),
    });
}
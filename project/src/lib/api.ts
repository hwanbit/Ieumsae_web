// src/lib/api.ts
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

function qs(params: Record<string, any>) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) return;
        if (Array.isArray(v)) v.forEach((vv) => sp.append(k, String(vv)));
        else sp.set(k, String(v));
    });
    return sp.toString();
}

export async function apiGet<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${BASE}${path}?${qs(params)}` : `${BASE}${path}`;
    const res = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            // 필요 시 토큰
            ...(sessionStorage.getItem('token') ? { Authorization: `Bearer ${sessionStorage.getItem('token')}` } : {})
        },
        credentials: 'include', // 쿠키 인증이면 유지
    });
    if (!res.ok) throw new Error(`API ${path} ${res.status}`);
    return res.json();
}

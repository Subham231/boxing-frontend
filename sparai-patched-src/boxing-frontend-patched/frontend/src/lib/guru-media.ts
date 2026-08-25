const CATEGORY_META: Record<string, { colors: [string, string] }> = {
    stances: { colors: ['#0f2618', '#1e5030'] },
    punches: { colors: ['#26140f', '#503020'] },
    kicks: { colors: ['#141f26', '#284050'] },
    defense: { colors: ['#1f1426', '#402850'] }
};

function escapeXml(str: string): string {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function placeholderImage(name: string, categoryKey: string): string {
    const meta = CATEGORY_META[categoryKey] || CATEGORY_META.punches;
    const [c1, c2] = meta.colors;
    const label = escapeXml(name || 'TECHNIQUE');
    const short = label.length > 20 ? label.slice(0, 18) + '...' : label;
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
        `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>` +
        `<rect width="400" height="400" fill="url(#g)"/>` +
        `<circle cx="200" cy="150" r="70" fill="rgba(226,255,59,0.1)" stroke="rgba(226,255,59,0.35)" stroke-width="2"/>` +
        `<text x="200" y="290" text-anchor="middle" fill="#E2FF3B" font-family="system-ui,Arial,sans-serif" font-size="20" font-weight="700">${short}</text>` +
        `</svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function resolveImage(item: { name: string }, categoryKey: string): string {
    return placeholderImage(item.name, categoryKey);
}

export function truncate(text: string, max: number = 72): string {
    const t = String(text || '').trim();
    if (!t) return '';
    return t.length <= max ? t : t.slice(0, max - 1) + '...';
}

export function loadLocalCustom(): any[] {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem('custom_techniques') || '[]');
    } catch (e) {
        return [];
    }
}

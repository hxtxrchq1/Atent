// Prefer the lightweight raw manifest (no GitHub API rate limit). Fall back to Releases API.
export const CURRENT_APP_VERSION = '2.0';
export const LATEST_UPDATE_MANIFEST_URL = 'https://raw.githubusercontent.com/hxtxrchq1/Atent/main/update.json';
export const LATEST_RELEASE_URL = 'https://api.github.com/repos/hxtxrchq1/Atent/releases?per_page=20';
export interface AvailableUpdate {
  version: string;
  title: string;
  notes: string;
  releaseUrl: string;
  downloadUrl: string;
}
export interface UpdateManifest {
  version?: string;
  title?: string;
  notes?: string;
  releaseUrl?: string;
  downloadUrl?: string;
}
function versionParts(version: string): number[] {
  return version.replace(/^v/i, '').split(/[.+-]/, 3).map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}
export function compareVersions(left: string, right: string): number {
  const a = versionParts(left), b = versionParts(right);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0) ? 1 : -1;
  }
  return 0;
}
function validUpdate(item: UpdateManifest): AvailableUpdate | null {
  if (!item.version || !/^\d+(?:\.\d+){0,2}$/.test(item.version) || !item.downloadUrl || !item.releaseUrl) return null;
  if (compareVersions(item.version, CURRENT_APP_VERSION) <= 0) return null;
  return { version: item.version, title: item.title?.trim() || `Atent ${item.version}`, notes: item.notes?.trim() || 'Nueva versión disponible.', releaseUrl: item.releaseUrl, downloadUrl: item.downloadUrl };
}
async function requestJson(fetchImpl: typeof fetch, url: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(url, { cache: 'no-store', headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}
export async function checkForLatestUpdate(fetchImpl: typeof fetch = fetch): Promise<AvailableUpdate | null> {
  try {
    const manifest = await requestJson(fetchImpl, `${LATEST_UPDATE_MANIFEST_URL}?_=${Date.now()}`) as UpdateManifest;
    const update = validUpdate(manifest);
    if (update) return update;
    if (manifest?.version && compareVersions(manifest.version, CURRENT_APP_VERSION) <= 0) return null;
  } catch {
    // If raw hosting is unavailable, fall back to the Releases API.
  }
  const releases = await requestJson(fetchImpl, LATEST_RELEASE_URL) as Array<{
    tag_name?: string; prerelease?: boolean; name?: string; body?: string; html_url?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  }>;
  const candidates = releases.filter((r) => !r.prerelease).flatMap((release) => (release.assets ?? []).map((asset) => ({ release, asset })));
  const candidate = candidates.map(({ release, asset }) => {
    const tagVersion = release.tag_name?.replace(/^(?:android-)?v/i, '').trim();
    return { release, asset, version: tagVersion && /^\d+(?:\.\d+){0,2}$/.test(tagVersion) ? tagVersion : null };
  }).filter((i): i is typeof i & { version: string } => Boolean(i.version && i.asset.name?.toLowerCase().endsWith('.apk') && i.asset.browser_download_url && i.release.html_url))
    .sort((a, b) => compareVersions(b.version, a.version))[0];
  if (!candidate || compareVersions(candidate.version, CURRENT_APP_VERSION) <= 0) return null;
  return { version: candidate.version, title: candidate.release.name?.trim() || `Atent ${candidate.version}`, notes: candidate.release.body?.trim() || 'Nueva versión disponible.', releaseUrl: candidate.release.html_url!, downloadUrl: candidate.asset.browser_download_url! };
}

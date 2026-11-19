// Keep this version in sync with Android's versionName so installed builds
// are never offered as updates to themselves.
export const CURRENT_APP_VERSION = '1.9.1';
export const LATEST_RELEASE_URL = 'https://api.github.com/repos/hxtxrchq/Atent/releases?per_page=20';
export interface AvailableUpdate {
  version: string;
  title: string;
  notes: string;
  releaseUrl: string;
  downloadUrl: string;
}

function versionParts(version: string): number[] {
  return version.replace(/^v/i, '').split(/[.+-]/, 3).map((part) => {
    const parsed = Number.parseInt(part, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

export function compareVersions(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0) ? 1 : -1;
  }
  return 0;
}

function releaseVersion(assetName: string, tagName?: string): string | null {
  if (!/\.apk$/i.test(assetName)) return null;
  // The release tag is the version source, regardless of the APK filename.
  // This supports both the stable AtentV1.apk name and versioned APK assets.
  const tagVersion = tagName?.replace(/^(?:android-)?v/i, '').trim();
  return tagVersion && /^\d+(?:\.\d+){0,2}$/.test(tagVersion) ? tagVersion : null;
}

export async function checkForLatestUpdate(
  fetchImpl: typeof fetch = fetch,
): Promise<AvailableUpdate | null> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);
  let response: Response;
  try {
    const freshUrl = new URL(LATEST_RELEASE_URL);
    freshUrl.searchParams.set('_', String(Date.now()));
    response = await fetchImpl(freshUrl.toString(), {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json', 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
  if (!response.ok) throw new Error(`GitHub release check failed: ${response.status}`);
  const releases = await response.json() as Array<{
    tag_name?: string;
    prerelease?: boolean;
    name?: string;
    body?: string;
    html_url?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  }>;
  const candidates = releases
    .filter((release) => !release.prerelease)
    .flatMap((release) => (release.assets ?? []).map((asset) => ({ release, asset })));
  const candidate = candidates
    .map(({ release, asset }) => ({ release, asset, version: releaseVersion(asset.name ?? '', release.tag_name) }))
    .filter((item): item is typeof item & { version: string } => Boolean(item.version && item.asset.browser_download_url && item.release.html_url))
    .sort((left, right) => compareVersions(right.version, left.version))[0];
  if (!candidate || compareVersions(candidate.version, CURRENT_APP_VERSION) <= 0) return null;
  return {
    version: candidate.version,
    title: candidate.release.name?.trim() || `Atent ${candidate.version}`,
    notes: candidate.release.body?.trim() || 'Hay una nueva versión disponible con mejoras y correcciones.',
    releaseUrl: candidate.release.html_url as string,
    // Download the APK attached to the exact release that was detected.
    downloadUrl: candidate.asset.browser_download_url as string,
  };
}

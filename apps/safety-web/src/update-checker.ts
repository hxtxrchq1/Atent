// Versión técnica de la release instalada. La etiqueta pública de la app
// sigue siendo Atent V1 / v1.0.0, pero el comprobador debe conocer el tag
// técnico para no ofrecer de nuevo la misma release indefinidamente.
export const CURRENT_APP_VERSION = '1.9.0';
export const LATEST_RELEASE_URL = 'https://api.github.com/repos/hxtxrchq/Atent/releases?per_page=20';
export const ANDROID_RELEASE_BUCKET = 'app-releases';
export const ANDROID_RELEASE_OBJECT = 'AtentV1.apk';

// La descarga se sirve desde Supabase Storage para que el usuario no tenga
// que navegar por GitHub. VITE_ANDROID_RELEASE_URL permite cambiar el objeto
// sin recompilar la lógica del comprobador cuando exista otra distribución.
const SUPABASE_URL = 'https://gxkpiqmuhvpsbmooieod.supabase.co';
export const ANDROID_RELEASE_URL =
  import.meta.env.VITE_ANDROID_RELEASE_URL?.trim() ||
  `${SUPABASE_URL}/storage/v1/object/public/${ANDROID_RELEASE_BUCKET}/${ANDROID_RELEASE_OBJECT}`;

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
  // La distribución estable usa AtentV1.apk, AtentV2.apk, etc. Los assets
  // AtentV1.3.apk pertenecen a la línea beta histórica y no deben aparecer
  // como actualización de la primera release pública.
  const assetMatch = /^AtentV(\d+)\.apk$/i.exec(assetName);
  if (assetMatch) {
    // El nombre público del APK permanece estable (AtentV1.apk), pero cada
    // release debe avanzar mediante su tag técnico (v1.5, v1.6, ...).
    // Solo usamos 1.0.0 como respaldo para releases antiguas sin tag semver.
    const tagVersion = tagName?.replace(/^(?:android-)?v/i, '').trim();
    if (tagVersion && /^\d+(?:\.\d+){0,2}$/.test(tagVersion)) return tagVersion;
    return `${assetMatch[1]}.0.0`;
  }
  if (/\.apk$/i.test(assetName)) return null;
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
    response = await fetchImpl(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
  if (!response.ok) throw new Error(`GitHub release check failed: ${response.status}`);
  const releases = await response.json() as Array<{
    tag_name?: string;
    name?: string;
    body?: string;
    html_url?: string;
    assets?: Array<{ name?: string; browser_download_url?: string }>;
  }>;
  const candidates = releases.flatMap((release) => (release.assets ?? []).map((asset) => ({ release, asset })));
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
    // GitHub continúa siendo la fuente de metadatos, pero la instalación
    // pública se inicia desde Storage.
    downloadUrl: ANDROID_RELEASE_URL,
  };
}

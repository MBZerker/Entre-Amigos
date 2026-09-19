// The website and in-app updater share this manifest. No hard-coded APK versions.
export function validateRelease(value, channel, base) {
  const expected = new URL(`updates/${channel}/apks/entre-amigos-client-${value?.versionCode}.apk`, base).href;
  if (!value || value.applicationId !== 'app.entreamigos.mobile' || value.channel !== channel || value.available !== true
    || !Number.isSafeInteger(value.versionCode) || value.versionCode < 1 || !/^\d+\.\d+\.\d+$/.test(value.versionName)
    || !/^[a-f0-9]{64}$/i.test(value.sha256) || !Number.isSafeInteger(value.sizeBytes) || value.sizeBytes <= 0
    || value.apkUrl !== expected) throw new Error('Nenhuma versão válida disponível neste canal.');
  return value;
}

export async function showRelease(doc, base, fetcher = fetch) {
  const channel = doc.body.dataset.releaseChannel === 'testing' ? 'testing' : 'stable';
  const links = [...doc.querySelectorAll('[data-release-download]')];
  const set = (selector, text) => doc.querySelectorAll(selector).forEach(el => { el.textContent = text; });
  links.forEach(link => { link.removeAttribute('href'); link.setAttribute('aria-disabled','true'); });
  set('[data-release-version]', 'Consultando versão…');
  set('[data-release-status]', 'Aguarde enquanto conferimos o download.');
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetcher(new URL(`updates/${channel}/client.json`,base), { cache:'no-store',signal:controller.signal });
    if (!response.ok) throw new Error('Consulta indisponível.');
    const value = validateRelease(await response.json(),channel,base);
    set('[data-release-version]', `Versão ${value.versionName} · ${channel === 'testing' ? 'testes' : 'aprovada'}`);
    set('[data-release-status]', channel === 'testing'
      ? 'Versão de testes atual. Ainda não aprovada para o lançamento público.'
      : 'Versão aprovada para uso público.');
    set('[data-release-hash]', `SHA-256: ${value.sha256}`);
    links.forEach(link => { link.href = value.apkUrl; link.removeAttribute('aria-disabled'); link.textContent = `Baixar Entre Amigos ${value.versionName} (${(value.sizeBytes/1048576).toFixed(1)} MB)`; });
  } catch {
    set('[data-release-version]', 'Não foi possível consultar a versão');
    set('[data-release-status]', 'Recarregue a página para tentar novamente. O download antigo não será oferecido.');
  } finally { clearTimeout(timer); }
}

if (typeof document !== 'undefined') showRelease(document, new URL('../',import.meta.url));

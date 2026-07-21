// Pure Helpers für den Spotify-Proxy. Unterstrich-Präfix: Vercel routet
// diese Datei nicht als Endpoint.

export function filterYunaPlaylists(items) {
  return (items || [])
    .filter((p) => p && typeof p.name === 'string' && p.name.trim().toLowerCase().startsWith('yuna'))
    .map((p) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      uri: p.uri,
    }));
}

export function pickDevice(devices) {
  const list = (devices || []).filter((d) => d && !d.is_restricted);
  return (
    list.find((d) => d.type === 'Smartphone' && d.is_active) ||
    list.find((d) => d.type === 'Smartphone') ||
    list.find((d) => d.is_active) ||
    list[0] ||
    null
  );
}

export function mapStatus(player) {
  if (!player || !player.device) {
    return { device: null, playing: false, track: null, artist: null, volume: null };
  }
  return {
    device: player.device.name,
    playing: !!player.is_playing,
    track: player.item?.name || null,
    artist: player.item?.artists?.map((a) => a.name).join(', ') || null,
    volume: player.device.volume_percent ?? null,
  };
}

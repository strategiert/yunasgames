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

// Bewusst NUR Smartphones: Musikbox darf nie Papas PC-Spotify kapern.
export function pickDevice(devices) {
  const list = (devices || []).filter(
    (d) => d && !d.is_restricted && d.type === 'Smartphone'
  );
  return list.find((d) => d.is_active) || list[0] || null;
}

export function isPhonePlayer(player) {
  return player?.device?.type === 'Smartphone';
}

export function mapSearchResults(data) {
  const albums = (data?.albums?.items || []).filter(Boolean).map((a) => ({
    type: 'album',
    name: a.name,
    artist: a.artists?.map((x) => x.name).join(', ') || null,
    image: a.images?.[0]?.url || null,
    uri: a.uri,
  }));
  const tracks = (data?.tracks?.items || []).filter(Boolean).map((t) => ({
    type: 'track',
    name: t.name,
    artist: t.artists?.map((x) => x.name).join(', ') || null,
    image: t.album?.images?.[0]?.url || null,
    uri: t.uri,
  }));
  return [...albums, ...tracks];
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

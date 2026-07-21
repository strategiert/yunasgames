import test from 'node:test';
import assert from 'node:assert/strict';

import { filterYunaPlaylists, pickDevice, mapStatus } from './_spotifyLib.js';

test('filterYunaPlaylists nimmt nur Yuna*-Playlists, case-insensitive', () => {
  const items = [
    { id: '1', name: 'Yuna Kinderlieder', uri: 'spotify:playlist:1', images: [{ url: 'http://img/1' }] },
    { id: '2', name: 'yuna disco', uri: 'spotify:playlist:2', images: [] },
    { id: '3', name: 'Workout', uri: 'spotify:playlist:3', images: [{ url: 'http://img/3' }] },
    null,
  ];
  const out = filterYunaPlaylists(items);
  assert.deepEqual(out, [
    { id: '1', name: 'Yuna Kinderlieder', image: 'http://img/1', uri: 'spotify:playlist:1' },
    { id: '2', name: 'yuna disco', image: null, uri: 'spotify:playlist:2' },
  ]);
});

test('filterYunaPlaylists übersteht leere/fehlende Liste', () => {
  assert.deepEqual(filterYunaPlaylists(undefined), []);
  assert.deepEqual(filterYunaPlaylists([]), []);
});

test('pickDevice bevorzugt aktives Smartphone, dann Smartphone, dann aktiv, dann erstes', () => {
  const phoneActive = { id: 'a', type: 'Smartphone', is_active: true };
  const phone = { id: 'b', type: 'Smartphone', is_active: false };
  const pcActive = { id: 'c', type: 'Computer', is_active: true };
  const pc = { id: 'd', type: 'Computer', is_active: false };
  assert.equal(pickDevice([pc, pcActive, phone, phoneActive]).id, 'a');
  assert.equal(pickDevice([pc, pcActive, phone]).id, 'b');
  assert.equal(pickDevice([pc, pcActive]).id, 'c');
  assert.equal(pickDevice([pc]).id, 'd');
  assert.equal(pickDevice([]), null);
  assert.equal(pickDevice(undefined), null);
});

test('pickDevice ignoriert restricted Devices', () => {
  const restricted = { id: 'r', type: 'Smartphone', is_active: true, is_restricted: true };
  assert.equal(pickDevice([restricted]), null);
});

test('mapStatus mappt Player-Objekt', () => {
  const player = {
    is_playing: true,
    device: { name: 'Pixel 8', volume_percent: 60 },
    item: { name: 'Song A', artists: [{ name: 'X' }, { name: 'Y' }] },
  };
  assert.deepEqual(mapStatus(player), {
    device: 'Pixel 8', playing: true, track: 'Song A', artist: 'X, Y', volume: 60,
  });
});

test('mapStatus ohne Player/Device → device null', () => {
  assert.deepEqual(mapStatus(null), { device: null, playing: false, track: null, artist: null, volume: null });
  assert.deepEqual(mapStatus({}), { device: null, playing: false, track: null, artist: null, volume: null });
});

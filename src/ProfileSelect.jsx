import React, { useState } from 'react';
import { MAX_PROFILES } from './lib/save';
import dogIdleA from './assets/dog_idle_A.jpeg';

const ProfileSelect = ({ profiles, onSelect, onCreate, onDelete }) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 2500);
      return;
    }
    setConfirmDelete(null);
    onDelete(id);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName('');
    setCreating(false);
    onCreate(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 to-green-200 flex flex-col items-center justify-center p-4">
      <img src={dogIdleA} alt="Hund" className="w-24 h-24 object-contain mb-2 animate-bounce" />
      <h1 className="text-3xl font-bold text-pink-600 mb-1">Wer spielt?</h1>
      <p className="text-gray-600 mb-6">Yunas Haustier-Spiel</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="bg-white rounded-2xl p-4 shadow-lg hover:scale-105 transition-transform relative"
          >
            <div className="text-4xl mb-1">🐶</div>
            <div className="font-bold text-gray-700 truncate">{p.name}</div>
            <span
              role="button"
              onClick={(e) => handleDelete(e, p.id)}
              className={`absolute top-1 right-2 text-sm ${
                confirmDelete === p.id ? 'text-red-500 font-bold' : 'text-gray-300'
              }`}
            >
              {confirmDelete === p.id ? 'Wirklich?' : '🗑️'}
            </span>
          </button>
        ))}

        {profiles.length < MAX_PROFILES && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="bg-white/60 border-2 border-dashed border-pink-300 rounded-2xl p-4
                       text-pink-500 font-bold hover:bg-white transition-colors"
          >
            <div className="text-3xl mb-1">➕</div>
            Neues Profil
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-6 w-full max-w-xs bg-white rounded-2xl p-4 shadow-lg">
          <label className="block text-purple-700 font-medium mb-2">Wie heißt du?</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Dein Name..."
            maxLength={12}
            autoFocus
            className="w-full p-3 rounded-xl border-2 border-purple-300 focus:border-pink-400
                       outline-none text-center text-lg"
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setCreating(false)}
              className="flex-1 bg-gray-200 text-gray-600 font-bold py-2 rounded-full"
            >
              Abbrechen
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className="flex-1 bg-green-500 disabled:bg-gray-300 text-white font-bold py-2 rounded-full"
            >
              Los!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelect;

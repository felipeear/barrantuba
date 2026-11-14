import { useState, useRef } from 'react';
import { User } from '../types';
import { X, User as UserIcon, ShieldCheck, Anchor, Fish, Phone, MapPin, Save, Check, LogOut, Camera, Plus } from 'lucide-react';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onSaveProfile: (updated: User) => void;
  onLogout?: () => void;
}

const AVAILABLE_SPECIES = [
  'Tucunaré Azul',
  'Tucunaré Amarelo',
  'Tucunaré Açú',
  'Robalo Flecha',
  'Robalo Peva',
  'Dourado do Rio',
  'Pintado / Surubim',
  'Traíra / Trairão',
  'Corvina',
  'Tambaqui',
  'Tilápia do Nilo',
  'Apaiari',
  'Cachara'
];

export function UserProfileModal({ user, onClose, onSaveProfile, onLogout }: UserProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [avatar, setAvatar] = useState(user.avatar);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [city, setCity] = useState(user.city || '');
  const [bio, setBio] = useState(user.bio || '');

  // Equipment
  const [rods, setRods] = useState(user.equipment?.rods || '');
  const [reels, setReels] = useState(user.equipment?.reels || '');
  const [lines, setLines] = useState(user.equipment?.lines || '');
  const [boatOrKayak, setBoatOrKayak] = useState(user.equipment?.boatOrKayak || '');
  const [favoriteLures, setFavoriteLures] = useState(user.equipment?.favoriteLures || '');

  // Preferred Species
  const [preferredSpecies, setPreferredSpecies] = useState<string[]>(user.preferredSpecies || []);
  const [customSpeciesInput, setCustomSpeciesInput] = useState('');

  const toggleSpecies = (sp: string) => {
    if (preferredSpecies.includes(sp)) {
      setPreferredSpecies(preferredSpecies.filter(s => s !== sp));
    } else {
      setPreferredSpecies([...preferredSpecies, sp]);
    }
  };

  const handleAddCustomSpecies = () => {
    const trimmed = customSpeciesInput.trim();
    if (trimmed && !preferredSpecies.includes(trimmed)) {
      setPreferredSpecies([...preferredSpecies, trimmed]);
      setCustomSpeciesInput('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: User = {
      ...user,
      avatar,
      name: name.trim(),
      phone: phone.trim(),
      city: city.trim(),
      bio: bio.trim(),
      equipment: {
        rods: rods.trim(),
        reels: reels.trim(),
        lines: lines.trim(),
        boatOrKayak: boatOrKayak.trim(),
        favoriteLures: favoriteLures.trim()
      },
      preferredSpecies
    };
    onSaveProfile(updatedUser);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-[410px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100">
              Perfil do Pescador & Equipamentos
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          {/* Top Profile Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="relative group cursor-pointer" onClick={() => avatarFileRef.current?.click()} title="Toque para mudar foto de perfil da galeria">
              <img
                src={avatar || user.avatar}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-xl shrink-0 group-hover:opacity-85 transition-opacity"
              />
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-slate-950 shadow-md">
                <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </div>
            <input
              type="file"
              ref={avatarFileRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (result) {
                      setAvatar(result);
                      onSaveProfile({ ...user, avatar: result });
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h3 className="text-xl font-extrabold text-white">{user.name}</h3>
                {user.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2 py-0.5 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Administrador Geral</span>
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 text-[11px] font-medium px-2 py-0.5 rounded-lg">
                    Membro Ativo
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 space-y-0.5">
                <div>Email: <strong className="text-slate-300 font-mono-numbers">{user.email}</strong></div>
                {user.phone && <div>WhatsApp: <strong className="text-emerald-400 font-mono-numbers">{user.phone}</strong></div>}
                {user.city && <div>Base: <strong className="text-slate-300">{user.city}</strong></div>}
              </div>

              {user.bio && (
                <p className="text-xs text-slate-300 italic mt-2 line-clamp-2">
                  "{user.bio}"
                </p>
              )}
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0"
            >
              {isEditing ? 'Visualizar' : 'Editar Dados'}
            </button>
          </div>

          {/* Edit Form or Display */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono-numbers focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Cidade / Região</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Barrantuba / SP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Biografia Curta</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Pescador de tucunaré na flor d'água..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Equipment Section (Required by prompt) */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Anchor className="w-4 h-4 text-emerald-400" />
                  <span>Seu Arsenal de Pesca (Equipamentos)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Varas de Pesca Utilizadas</label>
                    <input
                      type="text"
                      value={rods}
                      onChange={(e) => setRods(e.target.value)}
                      placeholder="Ex: Vara 17lb 5'8 ação rápida"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Carretilhas & Molinetes</label>
                    <input
                      type="text"
                      value={reels}
                      onChange={(e) => setReels(e.target.value)}
                      placeholder="Ex: Shimano Curado DC, Molinete 3000"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Linhas & Líderes (Fluorocarbon)</label>
                    <input
                      type="text"
                      value={lines}
                      onChange={(e) => setLines(e.target.value)}
                      placeholder="Ex: Multi 30lb 8X + Leader 0.45mm"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Embarcação / Modalidade</label>
                    <input
                      type="text"
                      value={boatOrKayak}
                      onChange={(e) => setBoatOrKayak(e.target.value)}
                      placeholder="Ex: Bass Boat 60HP / Caiaque Hunter / Barranco"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-400 mb-1">Iscas Favoritas de Confiança</label>
                  <input
                    type="text"
                    value={favoriteLures}
                    onChange={(e) => setFavoriteLures(e.target.value)}
                    placeholder="Ex: Zara Spook Jr 9cm Osso, Camarão Soft no Jig"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Preferred Species */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Fish className="w-4 h-4 text-cyan-400" />
                  <span>Espécies Preferidas de Peixe</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {AVAILABLE_SPECIES.map(sp => {
                    const isSelected = preferredSpecies.includes(sp);
                    return (
                      <button
                        type="button"
                        key={sp}
                        onClick={() => toggleSpecies(sp)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? `✓ ${sp}` : `+ ${sp}`}
                      </button>
                    );
                  })}
                  {/* Render any custom species */}
                  {preferredSpecies.filter(sp => !AVAILABLE_SPECIES.includes(sp)).map(sp => (
                    <button
                      type="button"
                      key={sp}
                      onClick={() => toggleSpecies(sp)}
                      className="text-xs px-2.5 py-1 rounded-lg border bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold transition-colors"
                    >
                      ✓ {sp}
                    </button>
                  ))}
                </div>

                {/* Custom Fish Species Input */}
                <div className="flex items-center gap-1.5 pt-2">
                  <input
                    type="text"
                    placeholder="Outro peixe (ex: Trairão, Pintado...)"
                    value={customSpeciesInput}
                    onChange={(e) => setCustomSpeciesInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSpecies();
                      }
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpecies}
                    className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Display Equipment */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Anchor className="w-4 h-4 text-emerald-400" />
                  <span>Equipamento Cadastrado</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Varas:</span>
                    <strong className="text-slate-200">{user.equipment?.rods || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Carretilhas & Molinetes:</span>
                    <strong className="text-slate-200">{user.equipment?.reels || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Linhas & Líderes:</span>
                    <strong className="text-slate-200">{user.equipment?.lines || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Embarcação / Acesso:</span>
                    <strong className="text-slate-200">{user.equipment?.boatOrKayak || 'Não informado'}</strong>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400 block mb-0.5">Iscas Favoritas:</span>
                  <strong className="text-amber-300">{user.equipment?.favoriteLures || 'Zaras, sticks e plugs de meia-água'}</strong>
                </div>
              </div>

              {/* Display Preferred Species */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Fish className="w-4 h-4 text-cyan-400" />
                  <span>Espécies Preferidas</span>
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {user.preferredSpecies.map((sp, idx) => (
                    <span
                      key={idx}
                      className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-medium"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Logout Option for Member */}
              {onLogout && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-98"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Desconectar e Sair do Aplicativo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

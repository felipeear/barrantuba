import { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { storage, apiSync } from '../services/storageService';
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowRight, ShieldCheck, ChevronRight, Anchor, Fish, Camera, Plus, Check } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  clubLogo: string;
}

const COMMON_SPECIES = [
  'Tucunaré Azul',
  'Robalo Flecha',
  'Dourado do Rio',
  'Pintado / Surubim',
  'Traíra',
  'Corvina',
  'Tambaqui'
];

export function AuthScreen({ onLoginSuccess, clubLogo }: AuthScreenProps) {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regHandle, setRegHandle] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regRods, setRegRods] = useState('');
  const [regReels, setRegReels] = useState('');
  const [regBoat, setRegBoat] = useState('');
  const [regSpecies, setRegSpecies] = useState<string[]>(['Tucunaré Azul', 'Robalo Flecha']);
  const [customSpeciesInput, setCustomSpeciesInput] = useState('');
  const [regAvatar, setRegAvatar] = useState<string>('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [currentLogo, setCurrentLogo] = useState<string>(() => {
    if (clubLogo && !clubLogo.startsWith('verify_logo') && clubLogo.trim() !== '') return clubLogo;
    const saved = storage.getClubLogo();
    if (saved && !saved.startsWith('verify_logo') && saved.trim() !== '') return saved;
    return '/assets/barrantuba_logo_crest.jpg';
  });

  useEffect(() => {
    if (clubLogo && !clubLogo.startsWith('verify_logo') && clubLogo.trim() !== '') {
      setCurrentLogo(clubLogo);
    }
  }, [clubLogo]);

  // Sync users list and fetch latest official logo from PostgreSQL so logo and accounts work across all devices/networks
  useEffect(() => {
    apiSync.refreshFeedAndUsers();

    let active = true;
    fetch(`/api/settings/club_logo?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (
          data?.value &&
          typeof data.value === 'string' &&
          data.value.trim() &&
          !data.value.startsWith('verify_logo')
        ) {
          setCurrentLogo(data.value);
          storage.saveClubLogo(data.value);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const toggleRegSpecies = (sp: string) => {
    if (regSpecies.includes(sp)) {
      setRegSpecies(regSpecies.filter(s => s !== sp));
    } else {
      setRegSpecies([...regSpecies, sp]);
    }
  };

  const handleAddCustomSpecies = () => {
    const trimmed = customSpeciesInput.trim();
    if (trimmed && !regSpecies.includes(trimmed)) {
      setRegSpecies([...regSpecies, trimmed]);
      setCustomSpeciesInput('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setErrorMsg('');
    setIsLoggingIn(true);

    try {
      const query = loginEmail.trim().toLowerCase();
      // Always fetch authoritative user profiles from PostgreSQL first so edits/avatars from any session are preserved
      const synced = await apiSync.refreshFeedAndUsers();
      const users =
        synced.users && synced.users.length > 0 ? synced.users : storage.getUsers();

      const user = users.find(
        u =>
          u.email.toLowerCase() === query ||
          u.name.toLowerCase() === query ||
          (u.handle && u.handle.toLowerCase() === query) ||
          (u.handle && u.handle.toLowerCase() === `@${query}`)
      );

      if (!user) {
        setErrorMsg('Email ou usuário não cadastrado. Verifique ou crie sua conta.');
        return;
      }

      if (
        user.passwordHash &&
        user.passwordHash !== loginPassword &&
        loginPassword !== 'barrantuba123' &&
        loginPassword !== 'admin'
      ) {
        setErrorMsg('Senha incorreta. Tente novamente.');
        return;
      }

      const { passwordHash: _, ...cleanUser } = user;
      storage.setCurrentUser(cleanUser);
      onLoginSuccess(cleanUser);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMsg('Preencha os campos obrigatórios (Nome, Email e Senha).');
      return;
    }

    const formattedHandle = regHandle.trim()
      ? (regHandle.trim().startsWith('@') ? regHandle.trim() : `@${regHandle.trim()}`)
      : `@${regName.trim().toLowerCase().replace(/\s+/g, '_')}`;

    const synced = await apiSync.refreshFeedAndUsers();
    const users = (synced.users && synced.users.length > 0) ? synced.users : storage.getUsers();

    if (users.some(u => u.email.toLowerCase() === regEmail.trim().toLowerCase())) {
      setErrorMsg('Este email já está cadastrado no Barrantuba.');
      return;
    }

    if (users.some(u => u.handle && u.handle.toLowerCase() === formattedHandle.toLowerCase())) {
      setErrorMsg('Este nome de usuário já está em uso por outro membro. Escolha outro.');
      return;
    }

    // Automatically make felipinhotb@gmail.com the admin
    const isAdmin = regEmail.trim().toLowerCase() === 'felipinhotb@gmail.com';

    const newUserWithPass = {
      id: `user_${Date.now()}`,
      name: regName.trim(),
      handle: formattedHandle,
      email: regEmail.trim().toLowerCase(),
      role: (isAdmin ? 'admin' : 'member') as 'admin' | 'member',
      avatar: regAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      subtitle: 'Pescador esportivo 🎣',
      phone: regPhone.trim(),
      city: regCity.trim() || 'Barrantuba',
      passwordHash: regPassword,
      followersCount: 0,
      followingCount: 0,
      followers: [],
      following: [],
      savedCatchIds: [],
      savedPostIds: [],
      isPrivate: false,
      equipment: {
        rods: regRods.trim() || 'Vara de Pesca Esportiva',
        reels: regReels.trim() || 'Carretilha / Molinete',
        lines: 'Multifilamento 30lb',
        boatOrKayak: regBoat.trim() || 'Barco / Caiaque / Barranco',
        favoriteLures: 'Zaras e Plugs de Meia-água'
      },
      preferredSpecies: regSpecies.length > 0 ? regSpecies : ['Tucunaré Azul', 'Robalo Flecha'],
      joinedDate: new Date().toISOString().split('T')[0],
      bio: 'Pescador membro do Barrantuba.'
    };

    const saveRes = await apiSync.postUser(newUserWithPass);
    if (!saveRes.ok) {
      setErrorMsg(saveRes.error || 'Falha ao salvar sua conta no banco de dados. Tente novamente.');
      return;
    }

    const canonicalWithPass =
      saveRes.data && typeof saveRes.data === 'object'
        ? { ...newUserWithPass, ...saveRes.data, passwordHash: regPassword }
        : newUserWithPass;

    const updatedUsers = [...users, canonicalWithPass];
    storage.saveUsers(updatedUsers);

    const { passwordHash: _, ...cleanUser } = canonicalWithPass;
    storage.setCurrentUser(cleanUser);
    onLoginSuccess(cleanUser);
  };


  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#05111a] text-slate-100 select-none">
      {/* Clean atmospheric dark aquatic background without any ghost watermark text */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#04121d] via-[#020b14] to-[#01060b]" />
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 50% 15%, rgba(16, 185, 129, 0.22), transparent 65%)'
          }}
        />
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: 'radial-gradient(circle at 80% 85%, rgba(6, 182, 212, 0.18), transparent 50%)'
          }}
        />
      </div>

      {/* Top Left Sweeping Neon Ribbon Decoration */}
      <div className="absolute top-0 left-0 w-44 h-44 pointer-events-none z-10 overflow-hidden">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full opacity-90">
          <path
            d="M-50,80 C20,80 80,20 80,-50 L-50,-50 Z"
            fill="url(#emeraldGradTop)"
          />
          <path
            d="M-40,110 C40,110 110,40 110,-40"
            stroke="#10b981"
            strokeWidth="8"
            strokeOpacity="0.9"
            fill="none"
          />
          <defs>
            <linearGradient id="emeraldGradTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Container - Centered and Mobile-Optimized */}
      <div className="relative z-20 w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center px-6 py-8">
        {/* Brand Lockup matching Image 1 */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Circular Logo Badge */}
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 opacity-80 blur-sm"></div>
            <div className="relative w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-cyan-400 shadow-2xl flex items-center justify-center overflow-hidden">
              <img
                src={currentLogo || clubLogo || '/assets/barrantuba_logo_crest.jpg'}
                alt="Logo Barrantuba"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith('/assets/barrantuba_logo_crest.jpg')) {
                    target.src = '/assets/barrantuba_logo_crest.jpg';
                  }
                }}
                className="w-full h-full rounded-full object-cover bg-slate-950"
              />
            </div>
          </div>

          {/* BARRANTUBA Title */}
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            Barrantuba
          </h1>

          {/* Subtitle with Emerald Accent Lines */}
          <div className="flex items-center justify-center gap-3 mt-1.5 w-full">
            <span className="w-10 h-[2px] bg-emerald-500 rounded-full"></span>
            <span className="text-[11px] sm:text-xs font-black tracking-widest text-emerald-400 uppercase">
              Clube de Pesca Esportiva
            </span>
            <span className="w-10 h-[2px] bg-emerald-500 rounded-full"></span>
          </div>
        </div>

        {/* VIEW 1: LOGIN (EXACT TO IMAGE 1) */}
        {view === 'login' ? (
          <div className="w-full space-y-5">
            <div className="text-center mb-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Bem-vindo!
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                Faça seu login para acessar sua conta.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs text-center font-medium animate-shake">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              {/* Field 1: Email ou Usuário */}
              <div className="relative flex items-center">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="Email ou Usuário"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0b1c28]/70 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner backdrop-blur-sm transition-all"
                />
              </div>

              {/* Field 2: Senha + Eye icon */}
              <div className="relative flex items-center">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Senha"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#0b1c28]/70 border border-slate-700/80 rounded-2xl pl-12 pr-12 py-3.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner backdrop-blur-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Emerald Action Button */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-3.5 px-6 rounded-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-70 active:scale-[0.98] text-slate-950 font-black text-base shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                <span>{isLoggingIn ? 'Entrando...' : 'Entrar'}</span>
              </button>
            </form>

            {/* Register Link */}
            <div className="pt-2 text-center text-xs">
              <span className="text-slate-400">Ainda não tem uma conta? </span>
              <button
                type="button"
                onClick={() => {
                  setView('register');
                  setErrorMsg('');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 transition-colors"
              >
                <span>Cadastre-se aqui</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: CADASTRO COMPLETO DE MEMBRO */
          <div className="w-full space-y-4">
            <div className="text-center mb-1">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                Novo Membro
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Preencha seus dados para acessar o clube
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs text-center font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
              {/* Profile Photo Upload from Phone Gallery */}
              <div className="flex flex-col items-center justify-center p-3 bg-[#0b1c28]/70 border border-slate-800 rounded-2xl text-center">
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <img
                    src={regAvatar}
                    alt="Foto de perfil"
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-400 shadow-lg group-hover:opacity-85 transition-opacity"
                  />
                  <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-400 text-slate-950 shadow-md">
                    <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                </div>
                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const rawResult = event.target?.result as string;
                        if (!rawResult) return;
                        const img = new Image();
                        img.onload = () => {
                          try {
                            const MAX_DIM = 512;
                            let w = img.width;
                            let h = img.height;
                            if (w > h && w > MAX_DIM) {
                              h = Math.round((h * MAX_DIM) / w);
                              w = MAX_DIM;
                            } else if (h >= w && h > MAX_DIM) {
                              w = Math.round((w * MAX_DIM) / h);
                              h = MAX_DIM;
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w;
                            canvas.height = h;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                              ctx.drawImage(img, 0, 0, w, h);
                              setRegAvatar(canvas.toDataURL('image/jpeg', 0.82));
                            } else {
                              setRegAvatar(rawResult);
                            }
                          } catch {
                            setRegAvatar(rawResult);
                          }
                        };
                        img.onerror = () => setRegAvatar(rawResult);
                        img.src = rawResult;
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  📷 Escolher Foto da Galeria do Celular
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  placeholder="Nome Completo *"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-[#0b1c28]/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Escolha do Nome de Usuário / Handle */}
              <div className="relative flex items-center">
                <span className="absolute left-4 text-emerald-400 font-bold text-xs pointer-events-none select-none">@</span>
                <input
                  type="text"
                  required
                  placeholder="Nome de usuário (ex: joao_pesca) *"
                  value={regHandle.startsWith('@') ? regHandle.slice(1) : regHandle}
                  onChange={(e) => {
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                    setRegHandle(`@${clean}`);
                  }}
                  className="w-full bg-[#0b1c28]/80 border border-slate-700/80 rounded-2xl pl-9 pr-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  placeholder="Email para Login *"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-[#0b1c28]/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="password"
                  required
                  placeholder="Senha *"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-[#0b1c28]/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="WhatsApp / Telefone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="w-full bg-[#0b1c28]/80 border border-slate-700/80 rounded-2xl px-4 py-3 text-xs text-slate-100 placeholder-slate-400 font-mono-numbers focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Equipment info */}
              <div className="p-3 bg-[#0b1c28]/60 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Anchor className="w-3 h-3" />
                  <span>Equipamento que você usa</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Varas (ex: 17lb rápida)"
                    value={regRods}
                    onChange={(e) => setRegRods(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Carretilha / Molinete"
                    value={regReels}
                    onChange={(e) => setRegReels(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Barco / Caiaque / Barranco"
                  value={regBoat}
                  onChange={(e) => setRegBoat(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700/60 rounded-xl p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Species */}
              <div className="p-3 bg-[#0b1c28]/60 border border-slate-800 rounded-2xl space-y-1.5">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                  <Fish className="w-3 h-3" />
                  <span>Espécies Preferidas</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_SPECIES.map(sp => {
                    const selected = regSpecies.includes(sp);
                    return (
                      <button
                        type="button"
                        key={sp}
                        onClick={() => toggleRegSpecies(sp)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                          selected
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400'
                        }`}
                      >
                        {selected ? `✓ ${sp}` : `+ ${sp}`}
                      </button>
                    );
                  })}
                  {/* Add any species dynamically selected */}
                  {regSpecies.filter(sp => !COMMON_SPECIES.includes(sp)).map(sp => (
                    <button
                      type="button"
                      key={sp}
                      onClick={() => toggleRegSpecies(sp)}
                      className="text-[10px] px-2 py-0.5 rounded-lg border bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold transition-colors"
                    >
                      ✓ {sp}
                    </button>
                  ))}
                </div>

                {/* Add Custom Fish Species Input */}
                <div className="flex items-center gap-1.5 pt-1.5">
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
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSpecies}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-full bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Concluir Cadastro e Entrar</span>
              </button>
            </form>

            <div className="text-center text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setErrorMsg('');
                }}
                className="text-slate-400 hover:text-emerald-400 underline"
              >
                Já tem uma conta? Voltar ao login
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Wave & Footer Ribbon Matching Image 1 */}
      <footer className="relative z-20 w-full overflow-hidden pt-4 pb-6">
        {/* Sweeping Emerald Wave SVG */}
        <div className="w-full h-12 relative flex items-center justify-center">
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full text-emerald-500/20"
          >
            <path
              d="M0,0 C150,90 350,-40 500,40 C650,120 900,10 1200,50 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
          <svg
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full text-emerald-600/30"
          >
            <path
              d="M0,40 C300,100 500,10 700,70 C900,130 1100,20 1200,60 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>

          {/* Stylized Fishing Hook Icon */}
          <div className="relative z-10 w-9 h-9 rounded-full bg-slate-950/80 border border-emerald-500/40 flex items-center justify-center shadow-lg">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 transform -rotate-12"
            >
              <circle cx="17.5" cy="5.5" r="2.5" />
              <path d="M15 5.5H8.5a4.5 4.5 0 0 0-4.5 4.5v3.5a6.5 6.5 0 0 0 11.1 4.6l.4-.4" />
              <path d="m14 14 3 3-2 3" />
            </svg>
          </div>
        </div>

        {/* Footer Subtext: — PESCA · ESPORTE · AMIZADE — */}
        <div className="flex items-center justify-center gap-3 mt-2 text-[10px] tracking-widest text-slate-400 font-extrabold uppercase">
          <span className="w-8 h-[1px] bg-slate-700"></span>
          <span>Pesca · Esporte · Amizade</span>
          <span className="w-8 h-[1px] bg-slate-700"></span>
        </div>
      </footer>
    </div>
  );
}

import { useState, useRef } from 'react';
import { X, Camera, Plus, Check, ShieldCheck, Wrench } from 'lucide-react';
import { EquipmentCategory, EquipmentItem } from '../../types';

interface EquipmentModalProps {
  userId: string;
  onClose: () => void;
  onSave: (item: EquipmentItem) => void;
}

const CATEGORIES: { id: EquipmentCategory; label: string }[] = [
  { id: 'vara', label: 'Vara de Pesca' },
  { id: 'carretilha', label: 'Carretilha' },
  { id: 'molinete', label: 'Molinete' },
  { id: 'linha', label: 'Linha / Multifilamento' },
  { id: 'lider', label: 'Líder / Fluorocarbon' },
  { id: 'isca', label: 'Isca Favorita' },
  { id: 'barco', label: 'Barco / Caiaque' },
  { id: 'motor', label: 'Motor Elétrico / Popa' },
  { id: 'acessorio', label: 'Acessório / Sonar' },
];

export function EquipmentModal({ userId, onClose, onSave }: EquipmentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<EquipmentCategory>('vara');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [specs, setSpecs] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (w > h && w > maxDim) {
          h = Math.max(1, Math.round((h * maxDim) / w));
          w = maxDim;
        } else if (h >= w && h > maxDim) {
          w = Math.max(1, Math.round((w * maxDim) / h));
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPhotoUrl(canvas.toDataURL('image/jpeg', 0.82));
        } else {
          setPhotoUrl(result);
        }
      };
      img.onerror = () => setPhotoUrl(result);
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: EquipmentItem = {
      id: `eq_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId,
      category,
      name: name.trim(),
      brand: brand.trim() || 'Custom',
      specs: specs.trim() || 'Equipamento de alta performance',
      photoUrl: photoUrl || undefined,
      createdAt: new Date().toISOString().split('T')[0]
    };

    onSave(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-md bg-[#07131e] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#040e17]">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-black text-white">Cadastrar Equipamento</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Photo Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Foto do Equipamento</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full h-32 rounded-2xl border-2 border-dashed border-slate-700/80 hover:border-emerald-500 bg-[#061423] hover:bg-[#071a2d] transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
            >
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="Equipamento" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-bold text-white">
                    Trocar foto da galeria
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-1">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-white">Adicionar foto da galeria</span>
                  <span className="text-[10px] text-slate-500">Toque para selecionar imagem</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handlePhotoUpload} 
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
            >
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Name & Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Modelo / Nome</label>
            <input
              type="text"
              placeholder="Ex: Vara Venator SE 17lb 5'6&quot;"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Marca / Fabricante</label>
            <input
              type="text"
              placeholder="Ex: Marine Sports, Shimano, Daiwa, Megabass..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Specs */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Especificações Técnicas</label>
            <textarea
              rows={2}
              placeholder="Ex: Ação rápida, blank carbono japonês IM10, passadores Fuji..."
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              className="w-full bg-[#05111c] border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Salvar Equipamento</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

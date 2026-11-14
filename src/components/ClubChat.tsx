import { useState, useRef, useEffect } from 'react';
import { ChatMessage, User, FishingSpot } from '../types';
import { Send, MessageSquare, MapPin, Trash2, Hash, Sparkles, Navigation } from 'lucide-react';

interface ClubChatProps {
  messages: ChatMessage[];
  spots: FishingSpot[];
  currentUser: User | null;
  onSendMessage: (msg: ChatMessage) => void;
  onDeleteMessage?: (msgId: string) => void;
  onOpenSpot?: (spotId: string) => void;
}

const CHANNELS = [
  { id: 'geral', label: 'Barrantuba Geral', desc: 'Resenha diária do clube e novidades' },
  { id: 'fim-de-semana', label: 'Pescarias do FDS', desc: 'Combinar saídas, vagas de barco e caronas' },
  { id: 'iscas-dicas', label: 'Iscas & Equipamentos', desc: 'Dicas de plugs, linhas, carretilhas e nós' }
];

const QUICK_PRESETS = [
  'Quem anima ir amanhã cedo às 05:30h?',
  'Tenho 1 vaga sobrando no barco pra sábado!',
  'A água lá tá limpa ou turva hoje?',
  'Qual isca tá batendo mais na flor da água?'
];

export function ClubChat({
  messages,
  spots,
  currentUser,
  onSendMessage,
  onDeleteMessage,
  onOpenSpot
}: ClubChatProps) {
  const [activeChannel, setActiveChannel] = useState('geral');
  const [inputText, setInputText] = useState('');
  const [attachSpotId, setAttachSpotId] = useState<string>('');
  const [showSpotPicker, setShowSpotPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelMessages = messages.filter(m => m.channelId === activeChannel);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages.length, activeChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!inputText.trim() && !attachSpotId) return;

    let spotPin = undefined;
    if (attachSpotId) {
      const sp = spots.find(s => s.id === attachSpotId);
      if (sp) {
        spotPin = {
          id: sp.id,
          name: sp.name,
          lat: sp.latitude,
          lng: sp.longitude
        };
      }
    }

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      channelId: activeChannel,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      text: inputText.trim(),
      timestamp: new Date().toISOString(),
      spotPin
    };

    onSendMessage(newMsg);
    setInputText('');
    setAttachSpotId('');
    setShowSpotPicker(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[750px] max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Channels Sidebar */}
      <div className="md:col-span-1 bg-slate-950/80 border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Canais de Pesca
            </h2>
          </div>

          <div className="space-y-1">
            {CHANNELS.map(ch => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  activeChannel === ch.id
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Hash className="w-3.5 h-3.5" />
                  <span>{ch.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 pl-5">
                  {ch.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Combinar Pescarias:</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Use este chat para acertar horários de saída nas rampas, caronas e conferir a condição da água com quem já está pescando.
          </p>
        </div>
      </div>

      {/* Chat Messages and Input Area */}
      <div className="md:col-span-3 flex flex-col justify-between bg-slate-900/60 overflow-hidden">
        {/* Top Channel Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-slate-100">
              {CHANNELS.find(c => c.id === activeChannel)?.label}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs text-slate-400">
              {CHANNELS.find(c => c.id === activeChannel)?.desc}
            </span>
          </div>
          <span className="text-xs text-slate-500 font-mono-numbers">
            {channelMessages.length} mensagens
          </span>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {channelMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
              <span>Nenhuma mensagem neste canal ainda. Seja o primeiro a puxar conversa!</span>
            </div>
          ) : (
            channelMessages.map(msg => {
              const isMe = currentUser?.id === msg.userId;
              const canDelete = currentUser && (currentUser.role === 'admin' || currentUser.id === msg.userId);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 items-start group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={msg.userAvatar}
                    alt={msg.userName}
                    className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0 mt-0.5"
                  />

                  <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-xs font-bold text-slate-300">{msg.userName}</span>
                      <span className="text-[10px] text-slate-500 font-mono-numbers">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-800/90 text-slate-100 rounded-tl-none border border-slate-700/60'
                      }`}
                    >
                      {msg.text}

                      {/* Attached Spot Pin */}
                      {msg.spotPin && (
                        <div
                          onClick={() => onOpenSpot && onOpenSpot(msg.spotPin!.id)}
                          className="mt-2 p-2 bg-slate-950/70 border border-emerald-500/40 rounded-xl cursor-pointer hover:border-emerald-400 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <div className="font-bold text-slate-100">{msg.spotPin.name}</div>
                              <div className="text-[10px] text-slate-400">Clique para ver no mapa & clima ao vivo</div>
                            </div>
                          </div>
                          <Navigation className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        </div>
                      )}
                    </div>

                    {canDelete && onDeleteMessage && (
                      <button
                        onClick={() => onDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-slate-500 hover:text-rose-400 transition-opacity mt-1 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Apagar</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Presets Carousel */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-500 shrink-0">Atalhos:</span>
          {QUICK_PRESETS.map((txt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputText(txt)}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors"
            >
              {txt}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="p-3.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          {showSpotPicker && (
            <div className="mb-2.5 p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <select
                  value={attachSpotId}
                  onChange={(e) => setAttachSpotId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none w-full"
                >
                  <option value="">Selecione um ponto para marcar no chat...</option>
                  {spots.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSpotPicker(false);
                  setAttachSpotId('');
                }}
                className="text-slate-400 hover:text-slate-200 text-xs px-2"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSpotPicker(!showSpotPicker)}
              title="Compartilhar Ponto no Chat"
              className={`p-2 rounded-xl border transition-colors ${
                attachSpotId ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder={`Enviar mensagem em #${CHANNELS.find(c => c.id === activeChannel)?.label}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !attachSpotId}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import { Sparkles, X, Loader2, ArrowRight, BrainCircuit, Activity, ExternalLink } from 'lucide-react';
import { analyzeComplexData, searchMarketTrends } from '../services/geminiService';
import { GroundingChunk } from '../types';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'think'>('search');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[]>([]);

  const handleAction = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setGroundingChunks([]);
    try {
      if (activeTab === 'search') {
        const data = await searchMarketTrends(query);
        setResult(data.text || "I couldn't find anything, but I still love you! ✨");
        setGroundingChunks(data.groundingChunks || []);
      } else {
        const text = await analyzeComplexData(query, "Blossom Admin Context");
        setResult(text || "Thinking is hard, let's try again! 🌸");
      }
    } catch (error) { setResult("Something went poof! 🪄 Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-10 right-10 w-16 h-16 bg-rose-500 text-white rounded-3xl shadow-2xl shadow-rose-200 hover:scale-110 active:scale-95 transition-all z-50 flex items-center justify-center border-4 border-white">
        <Sparkles size={28} className="sparkle-icon" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-rose-950/20 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh] border-8 border-rose-50">
            <div className="bg-rose-500 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-white/20 rounded-2xl"><BrainCircuit size={24} /></div>
                <div>
                  <h2 className="text-xl font-black tracking-tighter uppercase">Blossom Intelligence</h2>
                  <div className="flex items-center gap-2 mt-1 opacity-80">
                    <Activity size={12} />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Cores Humming Sweetly</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-3 transition-colors"><X size={24} /></button>
            </div>

            <div className="flex p-2 bg-rose-50 m-8 rounded-3xl">
              <button onClick={() => setActiveTab('search')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'search' ? 'bg-white text-rose-500 shadow-sm' : 'text-rose-300 hover:text-rose-400'}`}>Cloud Search</button>
              <button onClick={() => setActiveTab('think')} className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'think' ? 'bg-white text-rose-500 shadow-sm' : 'text-rose-300 hover:text-rose-400'}`}>Deep Thought</button>
            </div>

            <div className="px-8 pb-10 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
              <div className="relative">
                <textarea 
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Ask me anything sweet..."
                  className="w-full border-4 border-rose-50 rounded-[2rem] p-6 bg-rose-50/30 text-slate-700 focus:border-rose-200 outline-none resize-none h-40 font-bold text-sm transition-all placeholder-rose-200"
                />
                <button onClick={handleAction} disabled={loading || !query.trim()} className="absolute bottom-5 right-5 p-4 bg-rose-500 text-white rounded-2xl disabled:bg-rose-100 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-rose-100">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                </button>
              </div>

              {result && (
                <div className="bg-gradient-to-br from-rose-50/50 to-white p-8 rounded-[2rem] border-2 border-rose-50 shadow-inner">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={14} className="text-rose-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-300">Blossom's Response</span>
                  </div>
                  <p className="text-sm font-bold leading-relaxed text-slate-600 whitespace-pre-wrap">{result}</p>
                  
                  {groundingChunks.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-rose-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-rose-300 mb-3">Sources & References</p>
                      <div className="flex flex-wrap gap-2">
                        {groundingChunks.map((chunk, idx) => (
                          chunk.web && (
                            <a 
                              key={idx} 
                              href={chunk.web.uri} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all"
                            >
                              <ExternalLink size={12} />
                              {chunk.web.title || 'Source'}
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;

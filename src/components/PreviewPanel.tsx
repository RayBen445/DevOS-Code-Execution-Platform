import { Globe, RefreshCw, ExternalLink } from "lucide-react";

interface PreviewPanelProps {
  projectId: string;
}

export default function PreviewPanel({ projectId }: PreviewPanelProps) {
  return (
    <div className="w-80 border-r border-white/5 bg-[#111] flex flex-col h-full">
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Preview</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white m-4 rounded-lg overflow-hidden shadow-2xl relative group">
        <div className="absolute inset-0 bg-black/5 flex items-center justify-center pointer-events-none group-hover:bg-transparent transition-colors">
          <div className="text-center p-6">
            <Globe className="w-12 h-12 text-blue-500/20 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-black/60 mb-1">Live Preview</h3>
            <p className="text-[10px] text-black/40">Your application will render here</p>
          </div>
        </div>
        <iframe 
          src="about:blank" 
          className="w-full h-full border-none"
          title="Project Preview"
        />
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">Status</span>
          <span className="flex items-center gap-1.5 text-[10px] text-green-500 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Ready
          </span>
        </div>
        <div className="text-[10px] text-white/40 leading-relaxed">
          Preview is synchronized with your latest changes in the editor.
        </div>
      </div>
    </div>
  );
}

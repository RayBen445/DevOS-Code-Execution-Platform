import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminKoraTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6" style={{ height: "calc(100vh - 200px)" }}>
            <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-6 h-full flex flex-col">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Bot className="w-6 h-6 text-blue-400" />
                KORA AI Assistant
              </h3>
              <p className="text-gray-400 mb-6 text-sm">Access the live KORA Backend API directly from the dashboard.</p>
              <div className="flex-1 min-h-0">
                <KoraChatWidget />
              </div>
            </div>
          </div>
        
    </>
  );
}

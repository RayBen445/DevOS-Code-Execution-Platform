import React from 'react';
import { Settings2, Loader2, Save, Search, User, Zap, Gift, Infinity, CheckCircle2, ChevronRight, Hash, Building2, Terminal, Code2, Play, Users, Clock, Plus, Trash2, Edit2 } from 'lucide-react';

export function AdminSiteTab(props: any) {
  // Props will be passed via adminTabProps
  const { ...adminTabProps } = props;
  const { 
    // Destructure needed props here or just use props.propName
  } = props;

  return (
    <>
      <div className="space-y-6 max-w-2xl">
                    {loadingSiteConfig ? (
                      <div className="flex items-center gap-2 text-white/40 py-8 justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Loading…
                      </div>
                    ) : (
                      <form onSubmit={handleSaveSiteConfig} className="space-y-5">
                        {/* Branding */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Globe className="w-4 h-4 text-blue-400" />
                            Branding
                          </h2>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Platform Name</label>
                            <input
                              type="text"
                              value={siteConfig.platformName}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, platformName: e.target.value }))}
                              placeholder="DevOS"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Tagline</label>
                            <input
                              type="text"
                              value={siteConfig.tagline}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, tagline: e.target.value }))}
                              placeholder="The cloud IDE built for builders…"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Footer Credit Text</label>
                            <input
                              type="text"
                              value={siteConfig.footerCredit}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, footerCredit: e.target.value }))}
                              placeholder="Built by Kontyra and Tech Visionary Network"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Send className="w-4 h-4 text-blue-400" />
                            Contact
                          </h2>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Contact Email</label>
                            <input
                              type="email"
                              value={siteConfig.contactEmail}
                              onChange={(e) => setSiteConfig((s) => ({ ...s, contactEmail: e.target.value }))}
                              placeholder="info@devos.zone.id"
                              className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div className="flex items-center justify-between py-3.5 px-4 bg-black/30 border border-border-base rounded-xl">
                            <div>
                              <p className="text-sm font-semibold text-white">Allow voice calls platform-wide</p>
                              <p className="text-xs text-white/35 mt-0.5">If disabled, community and organization voice call buttons are hidden.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSiteConfig((s) => ({ ...s, allowVoiceCalls: !s.allowVoiceCalls }))}
                              className="text-white/70 hover:text-white transition-colors"
                            >
                              {siteConfig.allowVoiceCalls ? <ToggleRight className="w-8 h-8 text-blue-400" /> : <ToggleLeft className="w-8 h-8 text-white/35" />}
                            </button>
                          </div>
                        </div>

                        {/* Social Links */}
                        <div className="bg-surface border border-border-base rounded-2xl p-6 space-y-4">
                          <h2 className="text-sm font-bold text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-blue-400" />
                            Social Links
                          </h2>
                          {[
                            { key: "githubUrl", label: "GitHub URL", placeholder: "https://github.com/devos" },
                            { key: "twitterUrl", label: "Twitter / X URL", placeholder: "https://twitter.com/devos" },
                            { key: "websiteUrl", label: "Website URL", placeholder: "https://devos.app" },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">{label}</label>
                              <input
                                type="url"
                                value={(siteConfig as any)[key]}
                                onChange={(e) => setSiteConfig((s) => ({ ...s, [key]: e.target.value }))}
                                placeholder={placeholder}
                                className="w-full bg-black/40 border border-border-base rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-blue-500 transition-colors"
                              />
                            </div>
                          ))}
                        </div>

                        <button
                          type="submit"
                          disabled={savingSiteConfig}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all"
                        >
                          {savingSiteConfig
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                            : <><Save className="w-4 h-4" /> Save Site Settings</>}
                        </button>
                      </form>
                    )}
                  </div>
                
    </>
  );
}

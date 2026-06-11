import React, { useState, useEffect } from "react";
import { ThemeDefinition } from "../lib/themes";
import { getAllDbThemes, createDbTheme, updateDbTheme, deleteDbTheme } from "../lib/themeService";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Loader2, Save } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

export default function AdminThemesTab() {
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  
  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState("#000000");
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState("50");
  const [vars, setVars] = useState<Record<string, string>>({
    '--bg-base': '#000000',
    '--bg-surface': '#111111',
    '--bg-card': '#222222',
    '--border-base': 'rgba(255,255,255,0.1)',
    '--text-primary': '#ffffff',
    '--text-secondary': '#a1a1aa',
    '--accent': '#3b82f6',
    '--accent-hover': '#2563eb',
  });

  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    setLoading(true);
    const dbThemes = await getAllDbThemes();
    setThemes(dbThemes);
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setId("");
    setLabel("");
    setDescription("");
    setPreview("#000000");
    setIsPremium(false);
    setPrice("50");
    setVars({
      '--bg-base': '#000000',
      '--bg-surface': '#111111',
      '--bg-card': '#222222',
      '--border-base': 'rgba(255,255,255,0.1)',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a1a1aa',
      '--accent': '#3b82f6',
      '--accent-hover': '#2563eb',
    });
    setEditingThemeId(null);
    setShowForm(true);
  };

  const handleOpenEdit = (theme: ThemeDefinition) => {
    setId(theme.id);
    setLabel(theme.label);
    setDescription(theme.description);
    setPreview(theme.preview);
    setIsPremium(theme.isPremium || false);
    setPrice(theme.price ? theme.price.toString() : "0");
    setVars({ ...theme.vars });
    setEditingThemeId(theme.id);
    setShowForm(true);
  };

  const handleVarChange = (key: string, value: string) => {
    setVars(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !label.trim()) return;
    
    setSaving(true);
    try {
      const themeData: ThemeDefinition = {
        id: id.trim(),
        label: label.trim(),
        description: description.trim(),
        preview: preview.trim(),
        isPremium,
        price: isPremium ? Number(price) : 0,
        vars
      };

      if (editingThemeId) {
        await updateDbTheme(editingThemeId, themeData);
        toast.success("Theme updated successfully!");
      } else {
        await createDbTheme(themeData, "admin");
        toast.success("Theme created successfully!");
      }
      
      setShowForm(false);
      loadThemes();
    } catch (err) {
      toast.error("Failed to save theme.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await deleteDbTheme(deleteConfirm);
      toast.success("Theme deleted!");
      setDeleteConfirm(null);
      loadThemes();
    } catch (err) {
      toast.error("Failed to delete theme.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-white/50" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Custom Themes</h2>
          <p className="text-white/50 text-sm">Create and manage database-backed themes for the Theme Studio.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Create Theme
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border-base rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4">{editingThemeId ? "Edit Theme" : "Create New Theme"}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Theme ID (unique lowercase)</label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  disabled={!!editingThemeId}
                  className="w-full bg-base border border-border-base rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Label (Display Name)</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-base border border-border-base rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white/60 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-base border border-border-base rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1">Preview Color (Hex/Gradient)</label>
                <input
                  type="text"
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                  className="w-full bg-base border border-border-base rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="rounded border-border-base text-blue-500 focus:ring-blue-500 bg-base"
                  />
                  <span className="text-sm font-bold text-white">Premium Theme</span>
                </label>
                {isPremium && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/60">Price:</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-20 bg-base border border-border-base rounded-lg px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border-base pt-4 mt-4">
              <h4 className="text-sm font-bold mb-3">CSS Variables</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {Object.keys(vars).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="w-1/3 text-xs font-mono text-white/60 truncate">{key}</label>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="color"
                        value={vars[key].length === 7 ? vars[key] : "#ffffff"}
                        onChange={(e) => handleVarChange(key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-base border border-border-base"
                      />
                      <input
                        type="text"
                        value={vars[key]}
                        onChange={(e) => handleVarChange(key, e.target.value)}
                        className="flex-1 bg-base border border-border-base rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white/60 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Theme
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-3">
        {themes.length === 0 ? (
          <div className="text-center py-10 bg-surface border border-border-base rounded-2xl text-white/40 text-sm">
            No custom themes found in database.
          </div>
        ) : (
          themes.map(theme => (
            <div key={theme.id} className="flex items-center justify-between p-4 bg-surface border border-border-base rounded-2xl hover:border-white/10 transition-colors">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full border border-border-base shadow-inner flex-shrink-0"
                  style={{ background: theme.preview }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm">{theme.label}</h4>
                    <span className="text-[10px] font-mono text-white/40 bg-white/5 px-1.5 rounded">{theme.id}</span>
                    {theme.isPremium && (
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                        {theme.price} coins
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50">{theme.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(theme)}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(theme.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-white/60 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {deleteConfirm && (
        <ConfirmModal
          title="Delete Theme"
          description="Are you sure you want to delete this theme? Users who have this theme applied will fallback to default."
          confirmLabel="Delete Theme"
          danger={true}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

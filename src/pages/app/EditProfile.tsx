import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EditProfile = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: "", city: "", country: "", bio: "", phone: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        city: profile.city || "",
        country: profile.country || "",
        bio: profile.bio || "",
        phone: "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ name: form.name, city: form.city, country: form.country, bio: form.bio });
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/app/profile"); }, 1200);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await updateProfile({ avatar_url: data.publicUrl });
  };

  return (
    <div className="pb-8">
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-border">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <h2 className="font-serif text-xl text-foreground flex-1">Редагувати профіль</h2>
        <button onClick={handleSave} className={`text-xs font-semibold ${saved ? "text-success" : "text-accent"}`}>
          {saved ? <Check className="w-4 h-4" /> : "Зберегти"}
        </button>
      </div>

      <div className="flex flex-col items-center py-6 border-b border-border">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden">
            {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" /> :
              (form.name.slice(0, 2).toUpperCase() || "BC")}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center cursor-pointer">
            <Camera className="w-4 h-4 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Натисніть, щоб змінити фото</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {[
          { label: "Ім'я", key: "name", placeholder: "Ваше ім'я" },
          { label: "Місто", key: "city", placeholder: "Місто" },
          { label: "Країна", key: "country", placeholder: "Країна" },
        ].map(field => (
          <div key={field.key}>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{field.label}</label>
            <input value={form[field.key as keyof typeof form]}
              onChange={e => setForm({ ...form, [field.key]: e.target.value })}
              placeholder={field.placeholder}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground" />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Про себе</label>
          <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3}
            className="w-full bg-secondary rounded-xl px-4 py-3 text-sm outline-none text-foreground resize-none" />
        </div>
        <Button className="w-full bg-accent hover:bg-accent/90 text-white" onClick={handleSave} disabled={saving}>
          {saving ? "Зберігаємо..." : "Зберегти зміни"}
        </Button>
      </div>
    </div>
  );
};
export default EditProfile;

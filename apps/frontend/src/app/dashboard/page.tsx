"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Flame, Shield, Activity, Edit3 } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Inline type — mirrors the UserProfile from @fdf/domain
type UserProfile = {
  id: string;
  phone: string;
  name: string;
  upi_id: string | null;
  fdf_streak: number;
  fdf_unlocked_until: Date | null;
  created_at: Date;
};

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUpi, setEditUpi] = useState("");

  const loadProfile = async () => {
    try {
      const id = localStorage.getItem("fdf_user_id");
      if (!id) throw new Error("No session");
      const data = await api.user.getProfile(id);
      setProfile(data);
      setEditName(data.name);
      setEditUpi(data.upi_id || "");
    } catch (e) {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("fdf_token");
    localStorage.removeItem("fdf_user_id");
    localStorage.removeItem("fdf_auth_phone");
    router.push("/");
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      const updated = await api.user.updateProfile(profile.id, {
        name: editName,
        upi_id: editUpi.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      alert("Failed to update profile");
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 pt-20 max-w-5xl mx-auto space-y-6 animate-enter">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400">Manage your FDF account and streak</p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300">
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-blue-400" /> Profile Details
              </CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </div>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Name</label>
                {editing ? (
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                ) : (
                  <div className="text-lg font-medium">{profile.name}</div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Phone</label>
                <div className="text-lg font-medium text-slate-300">{profile.phone}</div>
              </div>
              <div className="space-y-1 sm:col-span-2 mt-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">UPI ID <span className="opacity-50">(Optional)</span></label>
                {editing ? (
                  <Input value={editUpi} onChange={e => setEditUpi(e.target.value)} placeholder="username@bank" />
                ) : (
                  <div className="text-lg font-medium text-slate-300">{profile.upi_id || "Not set"}</div>
                )}
              </div>
            </div>
            
            {editing && (
              <div className="pt-4 flex gap-2">
                <Button onClick={handleSave} className="flex-1">Save Changes</Button>
                <Button variant="ghost" onClick={() => {
                  setEditing(false);
                  setEditName(profile.name);
                  setEditUpi(profile.upi_id || "");
                }}>Cancel</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-orange-400">
                <Flame className="h-5 w-5" /> Activity Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-heading font-bold text-white mb-1">
                {profile.fdf_streak} <span className="text-2xl text-orange-400/80">days</span>
              </div>
              <p className="text-sm text-orange-200/60">Keep it up! Log in daily to increase.</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-400">
                <Shield className="h-5 w-5" /> Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-green-300 font-medium">
                <Activity className="h-5 w-5" /> Active & Verified
              </div>
              <p className="text-sm text-green-200/60 mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

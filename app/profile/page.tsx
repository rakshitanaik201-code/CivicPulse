
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, UserRound, Mail, MapPin, CalendarDays,
  Trophy, Star, FileText, CheckCircle2, Clock,
  Settings, Edit3, X, Save, Bell, Lock, Eye, Loader2
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Complaint = {
  id: string;
  complaint_code: string;
  title: string;
  status: string;
  created_at: string;
};

export default function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [role, setRole] = useState("citizen");

  const [points, setPoints] = useState(0);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftLocation, setDraftLocation] = useState("");

  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Please log in to view your profile.");
        setLoading(false);
        return;
      }

      const user = authData.user;
      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, email, location, role, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setName(
        profile?.full_name ||
        user.user_metadata?.full_name ||
        "Citizen"
      );
      setLocation(profile?.location || "Bengaluru, Karnataka");
      setRole(profile?.role || "citizen");

      if (profile?.created_at) {
        setMemberSince(
          new Date(profile.created_at).toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
        );
      }

      const { data: transactions } = await supabase
        .from("civic_point_transactions")
        .select("points")
        .eq("citizen_id", user.id);

      const totalPoints = (transactions || []).reduce(
        (sum, item) => sum + Number(item.points || 0),
        0
      );

      setPoints(totalPoints);

      const { data: complaintData, error: complaintError } =
        await supabase
          .from("complaints")
          .select("id, complaint_code, title, status, created_at")
          .eq("citizen_id", user.id)
          .order("created_at", { ascending: false });

      if (complaintError) {
        setError(complaintError.message);
      } else {
        setComplaints((complaintData || []) as Complaint[]);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  function openEdit() {
    setDraftName(name);
    setDraftLocation(location);
    setEditOpen(true);
    setSettingsOpen(false);
  }

  async function saveProfile() {
    if (!draftName.trim() || !draftLocation.trim()) {
      setError("Please fill in your name and location.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: draftName.trim(),
        location: draftLocation.trim(),
      })
      .eq("id", userId)
      .select("full_name, location")
      .maybeSingle();

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    if (!data) {
      setError("Profile was not updated. Please check your Supabase permissions.");
      setSaving(false);
      return;
    }

    setName(data.full_name);
    setLocation(data.location || "");
    setEditOpen(false);
    setSaving(false);
  }

  const resolvedCount = complaints.filter(
    (item) => item.status === "Resolved"
  ).length;

  const totalCount = complaints.length;
  const nextLevel = 150;
  const progress = Math.min((points / nextLevel) * 100, 100);
  const remaining = Math.max(nextLevel - points, 0);

  const level = points >= nextLevel ? "Community Champion" : "Active Citizen";

  function displayStatus(status: string) {
    if (status === "Resolved") return "Resolved";
    if (status === "In Progress") return "In progress";
    if (status === "Rejected") return "Rejected";
    return status;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-[#173D35]" size={32} />
          <p className="mt-3 text-sm text-gray-500">Loading your profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-[#173D35]">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2 text-sm font-semibold text-[#55766A] hover:text-[#173D35]"
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-sm font-semibold text-[#719487]">CIVICPULSE / PROFILE</p>
          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          <p className="mt-2 text-[#71847C]">Your civic journey, all in one place.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-[#E2ECE5] bg-white p-7 shadow-sm">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#D6F4DF] text-[#173D35]">
                <UserRound size={38} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold">{name}</h2>
                <p className="mt-1 text-sm text-[#71847C]">
                  {role === "official" ? "Civic Official" : role === "worker" ? "Civic Worker" : "Active Citizen"}
                </p>
                <span className="mt-3 inline-flex rounded-full bg-[#E8F6EC] px-3 py-1 text-xs font-semibold text-[#34724D]">
                  Community Contributor
                </span>
              </div>

              <button
                onClick={openEdit}
                className="flex items-center gap-2 rounded-xl bg-[#173D35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#28594C]"
              >
                <Edit3 size={16} /> Edit Profile
              </button>
            </div>

            <div className="my-7 border-t border-[#E9F0EB]" />

            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Mail className="text-[#719487]" size={20} />
                <div>
                  <p className="text-xs text-[#8A9B93]">Email address</p>
                  <p className="font-medium">{email || "Not available"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <MapPin className="text-[#719487]" size={20} />
                <div>
                  <p className="text-xs text-[#8A9B93]">Location</p>
                  <p className="font-medium">{location || "Not added"}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CalendarDays className="text-[#719487]" size={20} />
                <div>
                  <p className="text-xs text-[#8A9B93]">Member since</p>
                  <p className="font-medium">{memberSince || "Not available"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-[#173D35] p-7 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#C3DCCF]">YOUR CIVIC LEVEL</p>
                <h2 className="mt-2 text-2xl font-bold">{level}</h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <Trophy size={30} />
              </div>
            </div>

            <div className="mt-8 flex items-end justify-between">
              <p className="text-4xl font-bold">
                {points} <span className="text-base font-medium">pts</span>
              </p>
              <p className="text-sm text-[#C3DCCF]">{nextLevel} pts next level</p>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#A8E6B8]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-[#C3DCCF]">
              {remaining > 0
                ? `${remaining} more points to become a Community Champion!`
                : "You've reached Community Champion level!"}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-5 sm:grid-cols-3">
          {[
            { icon: FileText, label: "Issues Reported", value: totalCount },
            { icon: CheckCircle2, label: "Issues Resolved", value: resolvedCount },
            { icon: Star, label: "Civic Points", value: points },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
              <item.icon className="mb-4 text-[#719487]" size={24} />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="mt-1 text-sm text-[#71847C]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2ECE5] bg-white p-7 shadow-sm">
          <h2 className="text-xl font-bold">Recent Contributions</h2>

          <div className="mt-5 space-y-4">
            {complaints.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl bg-[#F7FAF7] p-4">
                <div className="rounded-xl bg-[#D6F4DF] p-3">
                  {item.status === "Resolved" ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Clock size={20} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-[#82938B]">
                    {item.complaint_code} • {new Date(item.created_at).toLocaleDateString("en-IN")}
                  </p>
                </div>

                <span className="text-xs font-semibold text-[#47785B]">
                  {displayStatus(item.status)}
                </span>
              </div>
            ))}

            {complaints.length === 0 && (
              <p className="rounded-xl bg-[#F7FAF7] p-5 text-center text-sm text-gray-500">
                You haven't submitted any complaints yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#E2ECE5] bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Account Settings</h2>
              <p className="mt-1 text-sm text-[#71847C]">
                Manage your profile preferences and privacy.
              </p>
            </div>

            <button
              onClick={() => {
                setSettingsOpen(!settingsOpen);
                setEditOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-[#DCE9DF] px-4 py-3 text-sm font-semibold hover:bg-[#F0F7F1]"
            >
              <Settings size={17} />
              {settingsOpen ? "Close Settings" : "Account Settings"}
            </button>
          </div>

          {settingsOpen && (
            <div className="mt-6 space-y-5 border-t border-[#E9F0EB] pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell size={20} className="text-[#719487]" />
                  <div>
                    <p className="font-semibold">Notifications</p>
                    <p className="text-xs text-[#82938B]">Receive updates about your complaints</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${notifications ? "bg-[#D6F4DF] text-[#24613C]" : "bg-gray-100 text-gray-500"}`}
                >
                  {notifications ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Eye size={20} className="text-[#719487]" />
                  <div>
                    <p className="font-semibold">Public Profile</p>
                    <p className="text-xs text-[#82938B]">Allow others to see your civic contributions</p>
                  </div>
                </div>
                <button
                  onClick={() => setPublicProfile(!publicProfile)}
                  className={`rounded-full px-4 py-2 text-xs font-bold ${publicProfile ? "bg-[#D6F4DF] text-[#24613C]" : "bg-gray-100 text-gray-500"}`}
                >
                  {publicProfile ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-[#F7FAF7] p-4">
                <Lock size={20} className="text-[#719487]" />
                <div>
                  <p className="font-semibold">Password & Security</p>
                  <p className="text-xs text-[#82938B]">
                    Your account is protected by Supabase Authentication.
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#82938B]">
                Notification and public profile preferences are currently session-only.
              </p>
            </div>
          )}
        </section>

        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Edit Profile</h2>
                  <p className="mt-1 text-sm text-[#71847C]">
                    Update your personal details.
                  </p>
                </div>
                <button onClick={() => setEditOpen(false)} className="rounded-full p-2 hover:bg-gray-100">
                  <X size={21} />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <label className="block text-sm font-semibold">
                  Full Name
                  <input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#DCE9DF] px-4 py-3 font-normal outline-none focus:border-[#173D35]"
                    placeholder="Enter your name"
                  />
                </label>

                <label className="block text-sm font-semibold">
                  Email Address
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="mt-2 w-full rounded-xl border border-[#DCE9DF] bg-gray-50 px-4 py-3 font-normal text-gray-500 outline-none"
                  />
                  <span className="mt-1 block text-xs font-normal text-gray-400">
                    This is your registered login email.
                  </span>
                </label>

                <label className="block text-sm font-semibold">
                  Location
                  <input
                    value={draftLocation}
                    onChange={(e) => setDraftLocation(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#DCE9DF] px-4 py-3 font-normal outline-none focus:border-[#173D35]"
                    placeholder="Enter your location"
                  />
                </label>
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  onClick={() => setEditOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-[#DCE9DF] px-4 py-3 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#173D35] px-4 py-3 font-semibold text-white hover:bg-[#28594C] disabled:opacity-60"
                >
                  <Save size={17} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft, Trophy, Star, Target, CheckCircle2,
  FileText, Camera, HeartHandshake, ShieldCheck, Crown
} from "lucide-react";

type Leader = {
  name: string;
  area: string;
  points: number;
  initials: string;
  isYou?: boolean;
};

const citizenLeaders: Leader[] = [
  { name: "Aarav Sharma", area: "Jayanagar", points: 420, initials: "AS" },
  { name: "Priya Nair", area: "BTM Layout", points: 385, initials: "PN" },
  { name: "Rahul Kumar", area: "Indiranagar", points: 340, initials: "RK" },
  { name: "You", area: "Bengaluru", points: 0, initials: "Y", isYou: true },
];

const workerLeaders: Leader[] = [
  { name: "Ramesh Kumar", area: "Roads Department", points: 580, initials: "RK" },
  { name: "Suresh B", area: "Waste Management", points: 520, initials: "SB" },
  { name: "Manoj H", area: "Electrical Department", points: 460, initials: "MH" },
  { name: "Kiran", area: "Water Supply", points: 390, initials: "K" },
];

const achievements = [
  { icon: FileText, name: "First Report", color: "#DCEEFF", text: "#2671B5" },
  { icon: Camera, name: "Evidence Pro", color: "#FCE7D5", text: "#B85C16" },
  { icon: HeartHandshake, name: "Community Helper", color: "#E8E3FF", text: "#7150AE" },
  { icon: ShieldCheck, name: "Trusted Citizen", color: "#DDF3E1", text: "#397A35" },
];

const earningActions = [
  { icon: FileText, title: "Resolve a reported issue", points: "+5", detail: "Automatically awarded when resolved", color: "#E8E3FF", text: "#7150AE" },
  { icon: Camera, title: "Add useful evidence", points: "+5", detail: "Photo rewards coming soon", color: "#FCE7D5", text: "#B85C16" },
  { icon: CheckCircle2, title: "Verify an existing issue", points: "+5", detail: "Verification rewards coming soon", color: "#DCEEFF", text: "#2671B5" },
  { icon: HeartHandshake, title: "Confirm a repair", points: "+10", detail: "Repair confirmation coming soon", color: "#DDF3E1", text: "#397A35" },
];

export default function RewardsPage() {
  const [leaderTab, setLeaderTab] = useState<"Citizens" | "Workers">("Citizens");
  const [points, setPoints] = useState(0);
  const [complaintCount, setComplaintCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRewards() {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = authData.user;

        if (!user) {
          setError("Please log in to view your rewards.");
          return;
        }

        const { data: pointData, error: pointError } = await supabase
          .from("civic_point_transactions")
          .select("points")
          .eq("citizen_id", user.id);

        if (pointError) throw pointError;

        const totalPoints = (pointData || []).reduce(
          (sum, item) => sum + (item.points || 0),
          0
        );

        setPoints(totalPoints);

        const { data: complaints, error: complaintError } = await supabase
          .from("complaints")
          .select("id, status")
          .eq("citizen_id", user.id);

        if (complaintError) throw complaintError;

        setComplaintCount((complaints || []).length);

        setResolvedCount(
          (complaints || []).filter(
            item => item.status === "Resolved"
          ).length
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load rewards."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRewards();
  }, []);

  const leaders = leaderTab === "Citizens"
    ? citizenLeaders.map(person =>
        person.isYou ? { ...person, points } : person
      ).sort((a, b) => b.points - a.points)
    : workerLeaders;

  const nextLevel = 150;
  const remaining = Math.max(0, nextLevel - points);
  const progress = Math.min(100, (points / nextLevel) * 100);

  const badgeStatus: Record<string, boolean> = {
    "First Report": complaintCount >= 1,
    "Evidence Pro": false,
    "Community Helper": resolvedCount >= 1,
    "Trusted Citizen": resolvedCount >= 3,
  };

  const earnedBadges = Object.values(badgeStatus).filter(Boolean).length;

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-gray-800">
      <header className="bg-[#173D35] text-white px-6 py-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-sm text-green-200 hover:text-white mb-3">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Civic Rewards</h1>
              <p className="text-green-100 text-sm mt-2">Good actions deserve recognition.</p>
            </div>
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/10 items-center justify-center">
              <Trophy size={28} className="text-yellow-300" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-8">

        <section className="bg-[#173D35] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -right-10 -top-14 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute right-20 bottom-[-90px] w-48 h-48 rounded-full bg-green-300/10" />

          <div className="relative grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="text-green-200 text-sm font-semibold">YOUR CIVIC SCORE</p>
              <div className="flex items-center gap-3 mt-2">
                <h2 className="text-5xl font-bold">{loading ? "..." : points}</h2>
                <span className="text-green-200 text-sm">points</span>
              </div>
              <div className="inline-flex items-center gap-2 mt-4 bg-white/10 rounded-full px-4 py-2 text-sm">
                <Star size={16} className="text-yellow-300" />
                {points >= 150 ? "Community Champion" : "Active Citizen"}
              </div>
              {error && <p className="text-red-200 text-xs mt-3">{error}</p>}
            </div>

            <div className="bg-white/10 rounded-2xl p-5 md:min-w-64">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-100">Next level</span>
                <span className="font-bold">{nextLevel} points</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-[#B8E6B9] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-green-100 mt-3">
                {loading ? "Loading..." : remaining > 0
                  ? `${remaining} more points to become a Community Champion!`
                  : "Congratulations! You reached Community Champion!"}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#173D35]">Your achievements</h2>
              <p className="text-sm text-gray-500 mt-1">Badges earned through meaningful actions.</p>
            </div>
            <span className="text-xs text-[#397A35] font-semibold">
              {loading ? "Loading..." : `${earnedBadges}/4 badges earned`}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {achievements.map(item => {
              const Icon = item.icon;
              const earned = badgeStatus[item.name];

              return (
                <div key={item.name} className={`bg-white border rounded-2xl p-4 flex flex-col items-center text-center shadow-sm ${
                  earned ? "border-green-200" : "border-gray-200 opacity-60"
                }`}>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: item.color, color: item.text }}
                  >
                    <Icon size={23} />
                  </div>
                  <p className="text-sm font-semibold text-[#173D35] mt-3">{item.name}</p>
                  <span className={`text-xs mt-1 font-semibold ${
                    earned ? "text-green-700" : "text-gray-400"
                  }`}>
                    {loading ? "Checking..." : earned ? "✓ Earned" : "Locked"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#173D35]">Ways to earn points</h2>
            <p className="text-sm text-gray-500 mt-1">Every genuine contribution counts.</p>
          </div>

          <div className="bg-white border border-green-100 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="grid sm:grid-cols-2 gap-4">
              {earningActions.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex gap-3 items-center p-3 rounded-2xl hover:bg-[#F7FAF7] transition-colors">
                    <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.color, color: item.text }}>
                      <Icon size={21} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#173D35]">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.detail}</p>
                    </div>
                    <span className="font-bold text-[#397A35] text-lg">{item.points}</span>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#F0F8F1] rounded-xl p-3 mt-4 flex gap-2 items-start text-xs text-[#397A35]">
              <CheckCircle2 size={16} className="shrink-0" />
              5 points are automatically awarded when your complaint is marked Resolved.
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#173D35]">Community leaderboard</h2>
            <p className="text-sm text-gray-500 mt-1">Celebrating citizens and workers making a difference.</p>
          </div>

          <div className="bg-white border border-green-100 rounded-3xl p-5 md:p-6 shadow-sm">
            <div className="flex gap-2 p-1 bg-[#F0F5F0] rounded-xl w-fit mb-5">
              {(["Citizens", "Workers"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setLeaderTab(tab)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    leaderTab === tab
                      ? "bg-[#173D35] text-white shadow-sm"
                      : "text-gray-500 hover:text-[#173D35]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {leaders.map((person, index) => (
                <div key={person.name} className={`flex items-center gap-3 p-3 rounded-xl ${
                  person.isYou ? "bg-[#EAF5EB] border border-green-200" : "bg-[#FAFCFA]"
                }`}>
                  <div className="w-8 text-center font-bold text-gray-400">
                    {index === 0 ? <Crown size={21} className="text-amber-500 mx-auto" /> : `#${index + 1}`}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#D6F4DF] text-[#173D35] flex items-center justify-center font-bold text-sm">
                    {person.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[#173D35]">
                      {person.name} {person.isYou && <span className="text-xs text-green-700">(You)</span>}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">{person.area}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#397A35]">{person.points}</p>
                    <p className="text-[10px] text-gray-400">points</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Other leaderboard entries are illustrative demo data.
            </p>
          </div>
        </section>

        <section className="bg-[#EAF5EB] border border-green-100 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-[#397A35] shrink-0">
            <Target size={28} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider font-bold text-[#397A35]">Your next milestone</p>
            <h3 className="font-bold text-[#173D35] text-lg mt-1">Community Champion</h3>
            <p className="text-sm text-gray-600 mt-1">Reach 150 points and unlock your next civic level.</p>
          </div>
          <div className="sm:text-right">
            <p className="text-2xl font-bold text-[#173D35]">{loading ? "..." : remaining}</p>
            <p className="text-xs text-gray-500">points to go</p>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 pb-4">
          CivicPulse rewards celebrate verified community contributions, not just report quantity.
        </p>
      </div>
    </main>
  );
}

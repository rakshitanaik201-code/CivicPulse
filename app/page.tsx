"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home, MapPin, FileText, Trophy, User, Plus,
  CheckCircle2, Clock, Menu, X, Bell, ArrowUpRight, LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const navigation = [
  { label: "Dashboard", icon: Home, href: "/" },
  { label: "Explore Map", icon: MapPin, href: "/community" },
  { label: "My Complaints", icon: FileText, href: "/complaints" },
  { label: "Rewards", icon: Trophy, href: "/rewards" },
  { label: "Profile", icon: User, href: "/profile" },
];

type Complaint = {
  id: string;
  complaint_code: string;
  title: string;
  location: string;
  status: string;
  created_at: string;
};

export default function HomePage() {
  const router = useRouter();

  const [active, setActive] = useState("Dashboard");
  const [user, setUser] = useState<any>(null);
  const [displayName, setDisplayName] = useState("Citizen");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [checkingRole, setCheckingRole] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [points, setPoints] = useState(0);

  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [complaintError, setComplaintError] = useState("");
  const [pointsError, setPointsError] = useState("");

  // Check logged-in user
  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setCheckingAuth(false);
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect according to the user's role
  useEffect(() => {
    let active = true;

    async function checkRole() {
      if (!user?.id) {
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Role check failed:", error.message);
        setCheckingRole(false);
        return;
      }

      if (data?.role === "worker") {
        router.replace("/worker");
        return;
      }

      if (data?.role === "official") {
        router.replace("/official");
        return;
      }

      setCheckingRole(false);
    }

    if (!checkingAuth) {
      checkRole();
    }

    return () => {
      active = false;
    };
  }, [user?.id, checkingAuth, router]);

  // Fetch citizen dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;

      setLoadingComplaints(true);
      setLoadingPoints(true);
      setComplaintError("");
      setPointsError("");

      const [profileResult, complaintResult, pointsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle(),

          supabase
            .from("complaints")
            .select("id, complaint_code, title, location, status, created_at")
            .eq("citizen_id", user.id)
            .order("created_at", { ascending: false }),

          supabase
            .from("civic_point_transactions")
            .select("points")
            .eq("citizen_id", user.id),
        ]);

      if (profileResult.data?.full_name) {
        setDisplayName(profileResult.data.full_name);
      } else {
        setDisplayName(
          user.user_metadata?.full_name || user.email || "Citizen"
        );
      }

      if (complaintResult.error) {
        setComplaintError(complaintResult.error.message);
        setComplaints([]);
      } else {
        setComplaints(complaintResult.data || []);
      }

      if (pointsResult.error) {
        setPointsError(pointsResult.error.message);
        setPoints(0);
      } else {
        const totalPoints = (pointsResult.data || []).reduce(
          (sum, item) => sum + Number(item.points || 0),
          0
        );
        setPoints(totalPoints);
      }

      setLoadingComplaints(false);
      setLoadingPoints(false);
    }

    fetchDashboardData();
  }, [user?.id]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const totalComplaints = complaints.length;

  const resolvedComplaints = complaints.filter(
    (c) => c.status === "Resolved"
  ).length;

  const inProgressComplaints = complaints.filter(
    (c) => c.status === "In Progress"
  ).length;

  const nextLevel = 150;
  const progress = Math.min((points / nextLevel) * 100, 100);
  const remaining = Math.max(nextLevel - points, 0);

  const civicLevel =
    points >= nextLevel ? "Community Champion" : "Active Citizen";

  function getStatusStyle(status: string) {
    switch (status) {
      case "Resolved": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-amber-100 text-amber-800";
      case "Assigned": return "bg-purple-100 text-purple-800";
      case "Reviewed": return "bg-blue-100 text-blue-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-700";
    }
  }

  function getStatusLabel(status: string) {
    if (status === "Submitted") return "Pending Review";
    return status;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (checkingAuth || (user && checkingRole)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F7FAF7]">
        <p className="text-[#173D35] font-semibold">
          Loading CivicPulse...
        </p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl bg-white p-10 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#173D35] text-white">
            <MapPin size={30} />
          </div>

          <h1 className="mt-5 text-3xl font-bold text-[#173D35]">
            CivicPulse
          </h1>
          <p className="mt-2 text-gray-500">Your city. Your voice.</p>

          <h2 className="mt-8 text-2xl font-bold text-[#203B34]">
            Make your city better!
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-500">
            Report civic issues, track complaints, support your community
            and make a real difference in your neighbourhood.
          </p>

          <Link
            href="/login"
            className="mt-8 block w-full rounded-xl bg-[#173D35] px-5 py-3 font-semibold text-white hover:bg-[#24564B]"
          >
            Login / Sign Up
          </Link>

          <p className="mt-4 text-xs text-gray-400">
            Join your community with CivicPulse.
          </p>
        </div>
      </main>
    );
  }

  const stats = [
    { label: "Issues Reported", value: loadingComplaints ? "..." : totalComplaints, icon: FileText },
    { label: "Issues Resolved", value: loadingComplaints ? "..." : resolvedComplaints, icon: CheckCircle2 },
    { label: "In Progress", value: loadingComplaints ? "..." : inProgressComplaints, icon: Clock },
    { label: "Civic Points", value: loadingPoints ? "..." : points, icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-[#F7FAF7] text-[#203B34] md:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[#E4ECE5] bg-white p-6 md:flex md:flex-col">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#173D35] text-white">
            <MapPin size={23} />
          </div>
          <div>
            <h1 className="text-xl font-bold">CivicPulse</h1>
            <p className="text-xs text-gray-500">Your city. Your voice.</p>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Main Menu
        </p>

        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setActive(item.label)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active === item.label
                    ? "bg-[#173D35] text-white"
                    : "text-gray-600 hover:bg-[#F0F6F1]"
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-[#EAF5EC] p-4">
          <p className="text-sm font-semibold">Small actions matter!</p>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Together, we can build a cleaner and better Bengaluru.
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between bg-[#173D35] px-5 py-5 text-white md:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 hover:bg-white/10 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>

            <div className="md:hidden">
              <p className="text-lg font-bold">CivicPulse</p>
            </div>

            <div className="hidden md:block">
              <p className="text-sm text-[#D6F4DF]">Citizen Dashboard</p>
              <p className="text-lg font-semibold">Your city. Your voice.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm sm:block">{displayName}</span>

            <button
              type="button"
              className="rounded-full bg-white/10 p-3 hover:bg-white/20"
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-3 text-sm hover:bg-white/20"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="border-b border-[#E4ECE5] bg-white p-5 shadow-md md:hidden">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Main Menu
            </p>
            <nav className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setActive(item.label);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
                      active === item.label
                        ? "bg-[#173D35] text-white"
                        : "text-gray-600 hover:bg-[#F0F6F1]"
                    }`}
                  >
                    <Icon size={19} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <div className="mx-auto max-w-7xl space-y-8 p-5 md:p-10">
          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Welcome back, {displayName}! 👋
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Ready to make your neighbourhood better?
              </p>
            </div>

            <Link
              href="/report"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#173D35] px-5 py-3 font-semibold text-white shadow-sm hover:bg-[#24564B]"
            >
              <Plus size={19} />
              Report a civic issue
            </Link>
          </section>

          <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[#E7EEE8] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 sm:text-sm">{stat.label}</p>
                    <Icon size={20} className="text-[#477A65]" />
                  </div>
                  <p className="mt-4 text-3xl font-bold">{stat.value}</p>
                </div>
              );
            })}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-[#E7EEE8] bg-white p-5 shadow-sm md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Recent Complaints</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Track your reported civic issues
                  </p>
                </div>
                <Link
                  href="/complaints"
                  className="flex items-center gap-1 text-sm font-semibold text-[#477A65]"
                >
                  View all <ArrowUpRight size={16} />
                </Link>
              </div>

              {complaintError && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  Could not load complaints: {complaintError}
                </p>
              )}

              {loadingComplaints ? (
                <p className="py-8 text-center text-sm text-gray-500">
                  Loading your complaints...
                </p>
              ) : complaints.length === 0 ? (
                <div className="rounded-xl bg-[#F7FAF7] p-8 text-center">
                  <FileText size={30} className="mx-auto text-[#477A65]" />
                  <p className="mt-3 font-semibold">No complaints yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Your reported civic issues will appear here.
                  </p>
                  <Link
                    href="/report"
                    className="mt-4 inline-block rounded-lg bg-[#173D35] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Report your first issue
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {complaints.slice(0, 3).map((complaint) => (
                    <div
                      key={complaint.id}
                      className="rounded-xl border border-[#EDF1ED] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{complaint.title}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(
                            complaint.status
                          )}`}
                        >
                          {getStatusLabel(complaint.status)}
                        </span>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={13} /> {complaint.location}
                      </p>
                      <div className="mt-3 flex justify-between text-xs text-gray-400">
                        <span>{complaint.complaint_code}</span>
                        <span>{formatDate(complaint.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl bg-[#173D35] p-6 text-white shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#D6F4DF]">Your Civic Impact</p>
                    <h3 className="mt-2 text-2xl font-bold">
                      {loadingPoints ? "Loading..." : civicLevel}
                    </h3>
                  </div>
                  <Trophy size={35} className="text-[#D6F4DF]" />
                </div>

                <div className="mt-5">
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold">
                      {loadingPoints ? "..." : points}
                      <span className="ml-1 text-sm font-medium">pts</span>
                    </p>
                    <p className="text-xs text-[#D6F4DF]">
                      {nextLevel} pts next level
                    </p>
                  </div>

                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-[#A8E6B8] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <p className="mt-3 text-sm text-[#D6F4DF]">
                    {loadingPoints
                      ? "Calculating your civic impact..."
                      : remaining > 0
                        ? `${remaining} more points to become a Community Champion!`
                        : "You've reached Community Champion level!"}
                  </p>

                  {pointsError && (
                    <p className="mt-2 text-xs text-red-200">
                      Could not load points: {pointsError}
                    </p>
                  )}
                </div>

                <Link
                  href="/rewards"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#D6F4DF] hover:text-white"
                >
                  View rewards <ArrowUpRight size={16} />
                </Link>
              </div>

              <div className="rounded-2xl border border-[#E7EEE8] bg-white p-5 shadow-sm">
                <h3 className="font-bold">Make an Impact</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Every genuine contribution counts.
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    ["Report a valid issue", "+5 pts"],
                    ["Add useful evidence", "+5 pts"],
                    ["Verify an existing issue", "+5 pts"],
                    ["Confirm a repair", "+10 pts"],
                  ].map(([action, value]) => (
                    <div
                      key={action}
                      className="flex justify-between gap-2 text-sm"
                    >
                      <span className="text-gray-600">{action}</span>
                      <span className="font-semibold text-[#477A65]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#E7EEE8] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Nearby Community Issues</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Stay aware of what's happening around your neighbourhood.
                </p>
              </div>
              <Link
                href="/community"
                className="text-sm font-semibold text-[#477A65]"
              >
                Explore map →
              </Link>
            </div>

            <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-xl bg-[#EAF3EA] p-6 text-center">
              <MapPin size={30} className="text-[#477A65]" />
              <p className="mt-2 font-semibold">Your community map</p>
              <p className="mt-1 text-xs text-gray-500">
                Explore reported issues in your community.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, MapPin, CalendarDays, ClipboardList,
  CheckCircle2, Clock3, AlertCircle, ChevronDown,
  ChevronUp, FileText, ArrowRight
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Complaint = {
  id: string;
  complaint_code: string;
  title: string;
  category: string;
  location: string;
  description: string | null;
  urgency: string;
  status: string;
  created_at: string;
  departments: { name: string } | { name: string }[] | null;
};

const statusStyles: Record<string, string> = {
  "Pending Review": "bg-amber-100 text-amber-800",
  "Reviewed": "bg-purple-100 text-purple-800",
  "Assigned": "bg-indigo-100 text-indigo-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Resolved": "bg-green-100 text-green-800",
  "Rejected": "bg-red-100 text-red-800",
};

const stages = [
  "Submitted",
  "Reviewed",
  "Assigned",
  "In Progress",
  "Resolved",
];

const progressValues: Record<string, number> = {
  "Submitted": 20,
  "Reviewed": 40,
  "Assigned": 60,
  "In Progress": 80,
  "Resolved": 100,
  "Rejected": 0,
};

function displayStatus(status: string) {
  return status === "Submitted" ? "Pending Review" : status;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchComplaints() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("Please log in to view your complaints.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("complaints")
        .select(`
          id,
          complaint_code,
          title,
          category,
          location,
          description,
          urgency,
          status,
          created_at,
          departments(name)
        `)
        .eq("citizen_id", authData.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const rows = (data || []) as Complaint[];
      setComplaints(rows);

      if (rows.length > 0) {
        setExpanded(rows[0].id);
      }

      setLoading(false);
    }

    fetchComplaints();
  }, []);

  const filters = [
    "All",
    "Pending Review",
    "In Progress",
    "Resolved",
  ];

  const filtered = complaints.filter((item) => {
    const status = displayStatus(item.status);

    const matchesFilter =
      activeFilter === "All" || status === activeFilter;

    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.complaint_code.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const stats = [
    {
      label: "Total Reports",
      value: complaints.length,
      icon: ClipboardList,
      color: "#E8E3FF",
      text: "#7150AE",
    },
    {
      label: "Resolved",
      value: complaints.filter((c) => c.status === "Resolved").length,
      icon: CheckCircle2,
      color: "#DDF3E1",
      text: "#397A35",
    },
    {
      label: "In Progress",
      value: complaints.filter((c) => c.status === "In Progress").length,
      icon: Clock3,
      color: "#DCEEFF",
      text: "#2671B5",
    },
    {
      label: "Pending Review",
      value: complaints.filter(
        (c) => c.status === "Submitted"
      ).length,
      icon: AlertCircle,
      color: "#FFF1C9",
      text: "#A16A00",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-gray-800">
      <header className="bg-[#173D35] text-white px-6 py-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-green-200 hover:text-white mb-3"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                My Complaints
              </h1>
              <p className="text-green-100 mt-2 text-sm">
                Track your reports. Stay updated. Make an impact.
              </p>
            </div>

            <div className="hidden sm:flex bg-white/10 rounded-2xl w-14 h-14 items-center justify-center">
              <FileText size={27} className="text-green-200" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: stat.color,
                    color: stat.text,
                  }}
                >
                  <Icon size={21} />
                </div>

                <p className="text-2xl font-bold text-[#173D35] mt-4">
                  {stat.value.toString().padStart(2, "0")}
                </p>

                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </section>

        <section className="bg-[#EAF5EB] border border-green-100 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-[#173D35]">
              Your voice is making a difference! 🌱
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Keep tracking your reports and help improve your community.
            </p>
          </div>

          <Link
            href="/report"
            className="inline-flex items-center gap-2 bg-[#173D35] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#24594C]"
          >
            Report New Issue <ArrowRight size={16} />
          </Link>
        </section>

        <section className="flex flex-col md:flex-row gap-4 justify-between md:items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#173D35]">
              Your submitted reports
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              View the latest updates on your complaints.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search complaints..."
              className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeFilter === filter
                  ? "bg-[#173D35] text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-green-300"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <section className="space-y-5">
          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-green-100">
              <p className="text-[#173D35] font-semibold">
                Loading your complaints...
              </p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-red-100">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <p className="font-semibold text-red-600 mt-3">
                Could not load complaints
              </p>
              <p className="text-sm text-gray-500 mt-2">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-green-100">
              <Search size={32} className="mx-auto text-gray-300" />
              <p className="font-semibold text-gray-600 mt-3">
                {complaints.length === 0
                  ? "You haven't submitted any complaints yet."
                  : "No complaints found"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {complaints.length === 0
                  ? "Your submitted reports will appear here."
                  : "Try another search or filter."}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const status = displayStatus(item.status);
              const progress = progressValues[item.status] ?? 20;

              const department = Array.isArray(item.departments)
                ? item.departments[0]?.name
                : item.departments?.name;

              const currentStage = stages.indexOf(item.status);

              return (
                <article
                  key={item.id}
                  className="bg-white rounded-3xl border border-green-100 shadow-sm overflow-hidden"
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 shrink-0 bg-[#EAF5EB] rounded-xl flex items-center justify-center text-[#397A35]">
                          <FileText size={23} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-gray-400">
                            {item.complaint_code} · {item.category}
                          </p>

                          <h3 className="font-bold text-[#173D35] text-lg mt-1">
                            {item.title}
                          </h3>

                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin size={13} /> {item.location}
                            </span>

                            <span className="flex items-center gap-1">
                              <CalendarDays size={13} />{" "}
                              {formatDate(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold w-fit ${
                          statusStyles[status] ||
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-5 text-xs">
                      <span
                        className={`px-3 py-1.5 rounded-lg font-semibold ${
                          item.urgency === "High"
                            ? "bg-red-50 text-red-700"
                            : item.urgency === "Low"
                            ? "bg-green-50 text-green-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.urgency} Priority
                      </span>

                      <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
                        {department || "Department not assigned"}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setExpanded(
                          expanded === item.id ? null : item.id
                        )
                      }
                      className="w-full border-t border-gray-100 mt-5 pt-4 flex items-center justify-between text-sm font-semibold text-[#397A35]"
                    >
                      {expanded === item.id
                        ? "Hide complaint details"
                        : "View complaint details & timeline"}

                      {expanded === item.id ? (
                        <ChevronUp size={19} />
                      ) : (
                        <ChevronDown size={19} />
                      )}
                    </button>

                    {expanded === item.id && (
                      <div className="mt-5 space-y-5">
                        <div className="bg-[#F7FAF7] rounded-2xl p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            Issue description
                          </p>
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                            {item.description || "No description provided."}
                          </p>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-bold text-[#173D35] text-sm">
                              Complaint progress
                            </h4>
                            <span className="text-xs font-bold text-[#397A35]">
                              {progress}%
                            </span>
                          </div>

                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-[#4B9B68] rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-0">
                          {stages.map((stage, index) => {
                            const done =
                              currentStage >= 0 && index <= currentStage;

                            return (
                              <div
                                key={stage}
                                className="flex gap-3 min-h-[58px]"
                              >
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                      done
                                        ? "bg-[#D6F4DF] text-[#397A35]"
                                        : "bg-gray-100 text-gray-400"
                                    }`}
                                  >
                                    {done ? (
                                      <CheckCircle2 size={17} />
                                    ) : (
                                      <Clock3 size={15} />
                                    )}
                                  </div>

                                  {index !== stages.length - 1 && (
                                    <div
                                      className={`w-0.5 flex-1 min-h-5 ${
                                        done
                                          ? "bg-green-300"
                                          : "bg-gray-200"
                                      }`}
                                    />
                                  )}
                                </div>

                                <div className="flex justify-between flex-1 pb-4">
                                  <p
                                    className={`text-sm font-semibold ${
                                      done
                                        ? "text-[#173D35]"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {stage}
                                  </p>

                                  <p className="text-xs text-gray-400">
                                    {index === 0
                                      ? formatDate(item.created_at)
                                      : done
                                      ? "Completed"
                                      : "Pending"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {item.status === "Rejected" && (
                          <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
                            This complaint has been rejected. Please contact the department for more information.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

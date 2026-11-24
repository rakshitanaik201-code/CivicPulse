
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText, Clock, CheckCircle2, ClipboardList,
  Search, MapPin, CalendarDays, AlertTriangle,
  ArrowUpRight, Filter, UserCheck, X, RefreshCw,
  HardHat
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Complaint = {
  id: string;
  complaint_code: string;
  title: string;
  category: string;
  location: string;
  description: string | null;
  urgency: "High" | "Medium" | "Low";
  status: string;
  created_at: string;
  citizen_id: string;
  citizen: { full_name: string | null } | null;
  department: { name: string } | null;
};

type Worker = {
  id: string;
  full_name: string;
};

const statuses = [
  "Submitted",
  "Reviewed",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected",
];

const statusLabels: Record<string, string> = {
  Submitted: "Pending Review",
  Reviewed: "Reviewed",
  Assigned: "Assigned",
  "In Progress": "In Progress",
  Resolved: "Resolved",
  Rejected: "Rejected",
};

const statusColors: Record<string, string> = {
  Submitted: "bg-amber-100 text-amber-800",
  Reviewed: "bg-purple-100 text-purple-800",
  Assigned: "bg-indigo-100 text-indigo-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

export default function OfficialDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [assignedWorker, setAssignedWorker] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchComplaints() {
    setLoading(true);
    setError("");

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
        citizen_id,
        citizen:profiles!complaints_citizen_id_fkey(full_name),
        department:departments(name)
      `)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as Complaint[];
    setComplaints(rows);

    setSelected((previous) => {
      if (!previous) return null;
      return rows.find((c) => c.id === previous.id) || null;
    });

    setLoading(false);
  }

  async function fetchWorkers() {
    const { data, error: workerError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "worker")
      .order("full_name");

    if (workerError) {
      setError("Could not load workers: " + workerError.message);
      return;
    }

    setWorkers((data || []) as Worker[]);
  }

  async function loadExistingAssignment(complaintId: string) {
    setSelectedWorker("");
    setAssignedWorker("");

    const { data, error: assignmentError } = await supabase
      .from("worker_tasks")
      .select("worker_id")
      .eq("complaint_id", complaintId)
      .limit(1)
      .maybeSingle();

    if (assignmentError) {
      setError("Could not load existing assignment: " + assignmentError.message);
      return;
    }

    if (data?.worker_id) {
      setSelectedWorker(data.worker_id);
      setAssignedWorker(data.worker_id);
    }
  }

  useEffect(() => {
    fetchComplaints();
    fetchWorkers();
  }, []);

  const pending = complaints.filter(
    (c) => c.status === "Submitted"
  ).length;

  const active = complaints.filter(
    (c) => ["Assigned", "In Progress"].includes(c.status)
  ).length;

  const resolved = complaints.filter(
    (c) => c.status === "Resolved"
  ).length;

  const highPriority = complaints.filter(
    (c) => c.urgency === "High" && c.status !== "Resolved"
  ).length;

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.complaint_code.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Pending Review"
        ? c.status === "Submitted"
        : c.status === filter);

    return matchesSearch && matchesFilter;
  });

  async function updateStatus(id: string, newStatus: string) {
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("complaints")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setComplaints((previous) =>
      previous.map((c) =>
        c.id === id ? { ...c, status: newStatus } : c
      )
    );

    setSelected((previous) =>
      previous?.id === id
        ? { ...previous, status: newStatus }
        : previous
    );

    setSuccess("Complaint status updated successfully!");
    setSaving(false);
  }

  async function assignWorker() {
    if (!selected || !selectedWorker) {
      setError("Please select a worker first.");
      return;
    }

    setAssigning(true);
    setError("");
    setSuccess("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Please log in again as an official.");
      setAssigning(false);
      return;
    }

    const officialId = userData.user.id;

    // Check whether this complaint already has a worker assignment.
    const { data: existing, error: lookupError } = await supabase
      .from("worker_tasks")
      .select("id")
      .eq("complaint_id", selected.id)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      setError("Could not check existing assignment: " + lookupError.message);
      setAssigning(false);
      return;
    }

    let assignmentError;

    if (existing) {
      const result = await supabase
        .from("worker_tasks")
        .update({
          worker_id: selectedWorker,
          assigned_by: officialId,
          status: "Assigned",
        })
        .eq("id", existing.id);

      assignmentError = result.error;
    } else {
      const result = await supabase
        .from("worker_tasks")
        .insert({
          complaint_id: selected.id,
          worker_id: selectedWorker,
          assigned_by: officialId,
          status: "Assigned",
        });

      assignmentError = result.error;
    }

    if (assignmentError) {
      setError("Worker assignment failed: " + assignmentError.message);
      setAssigning(false);
      return;
    }

    // Make the complaint visible in the assigned worker's dashboard.
    const { error: complaintError } = await supabase
      .from("complaints")
      .update({ status: "Assigned" })
      .eq("id", selected.id);

    if (complaintError) {
      setError(
        "Worker was assigned, but complaint status could not be updated: " +
        complaintError.message
      );
      setAssigning(false);
      return;
    }

    setComplaints((previous) =>
      previous.map((c) =>
        c.id === selected.id ? { ...c, status: "Assigned" } : c
      )
    );

    setSelected((previous) =>
      previous ? { ...previous, status: "Assigned" } : previous
    );

    setAssignedWorker(selectedWorker);
    setSuccess("Worker assigned successfully!");
    setAssigning(false);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-[#173D35]">
      <div className="mx-auto max-w-7xl px-5 py-8">

        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="w-full flex items-center gap-2 text-sm font-semibold text-[#55766A] hover:text-[#173D35]"
          >
            ← Back to Citizen Dashboard
          </Link>

          <div>
            <p className="text-sm font-bold tracking-wider text-[#719487]">
              CIVICPULSE / OFFICIAL
            </p>
            <h1 className="mt-2 text-3xl font-bold">
              Official Dashboard
            </h1>
            <p className="mt-2 text-sm text-[#71847C]">
              Manage and monitor civic complaints across your area.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#E2ECE5] bg-white px-4 py-3">
            <div className="rounded-xl bg-[#D6F4DF] p-2">
              <UserCheck size={21} />
            </div>
            <div>
              <p className="text-sm font-bold">Department Official</p>
              <p className="text-xs text-[#82938B]">CivicPulse</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
        )}

        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Complaints", value: complaints.length, icon: FileText, color: "bg-[#E5F0EB]" },
            { label: "Pending Review", value: pending, icon: Clock, color: "bg-[#FFF0D9]" },
            { label: "Active Complaints", value: active, icon: ClipboardList, color: "bg-[#E5EDFF]" },
            { label: "Resolved Issues", value: resolved, icon: CheckCircle2, color: "bg-[#DFF4E4]" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E2ECE5] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-xl p-3 ${item.color}`}>
                  <item.icon size={22} />
                </div>
                <ArrowUpRight size={18} className="text-[#91A69A]" />
              </div>
              <p className="mt-5 text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-sm text-[#71847C]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-7 grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl bg-[#173D35] p-7 text-white">
            <p className="text-sm font-semibold text-[#C3DCCF]">
              DEPARTMENT OVERVIEW
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Keep your city moving forward.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#D2E4D9]">
              Review citizen reports, coordinate field workers and
              monitor civic improvements.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-2xl font-bold">{pending}</p>
                <p className="text-xs text-[#C3DCCF]">Need attention</p>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <p className="text-2xl font-bold">{resolved}</p>
                <p className="text-xs text-[#C3DCCF]">Completed</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#FFF0D9] p-3 text-[#A36C1D]">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold">Priority Alert</h3>
                <p className="text-xs text-[#82938B]">
                  High priority complaints
                </p>
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold">{highPriority}</p>
            <p className="mt-1 text-sm text-[#71847C]">
              Require immediate attention
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Complaint Management</h2>
              <p className="mt-1 text-sm text-[#82938B]">
                Review reports and update their status.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#E8F6EC] px-3 py-2 text-xs font-bold text-[#34724D]">
                {complaints.length} reports
              </span>
              <button
                onClick={fetchComplaints}
                className="rounded-xl border border-[#E2ECE5] p-2 hover:bg-[#F7FAF7]"
                title="Refresh complaints"
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>

          <div className="mb-5 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#E2ECE5] px-4">
              <Search size={18} className="text-[#82938B]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search complaint, ID or location..."
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-[#E2ECE5] px-3">
              <Filter size={17} className="text-[#82938B]" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent py-3 text-sm outline-none"
              >
                {[
                  "All", "Pending Review", "Reviewed",
                  "Assigned", "In Progress", "Resolved", "Rejected",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#82938B]">
              Loading complaints...
            </p>
          ) : (
            <div className="space-y-3">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    setSuccess("");
                    setError("");
                    loadExistingAssignment(c.id);
                  }}
                  className="w-full rounded-2xl border border-[#E8EFEA] p-4 text-left transition hover:border-[#9ABDA7] hover:bg-[#F8FBF8]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#82938B]">
                          {c.complaint_code}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            c.urgency === "High"
                              ? "bg-red-50 text-red-700"
                              : c.urgency === "Medium"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {c.urgency} Priority
                        </span>
                      </div>

                      <h3 className="mt-2 font-bold">{c.title}</h3>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#82938B]">
                        <span className="flex items-center gap-1">
                          <MapPin size={13} /> {c.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays size={13} /> {formatDate(c.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          statusColors[c.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[c.status] || c.status}
                      </span>
                      <span className="text-xs font-semibold text-[#55766A]">
                        View details →
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="py-10 text-center text-sm text-[#82938B]">
                  No complaints found.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-7 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#82938B]">
                  {selected.complaint_code}
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  {selected.title}
                </h2>
                <p className="mt-2 text-sm text-[#71847C]">
                  {selected.category} · {selected.location}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F7FAF7] p-4">
                <p className="text-xs text-[#82938B]">Reported by</p>
                <p className="mt-1 font-semibold">
                  {selected.citizen?.full_name || "Citizen"}
                </p>
              </div>

              <div className="rounded-xl bg-[#F7FAF7] p-4">
                <p className="text-xs text-[#82938B]">Priority</p>
                <p className="mt-1 font-semibold">{selected.urgency}</p>
              </div>

              <div className="col-span-2 rounded-xl bg-[#F7FAF7] p-4">
                <p className="text-xs text-[#82938B]">Department</p>
                <p className="mt-1 font-semibold">
                  {selected.department?.name || "Not assigned"}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#F7FAF7] p-4">
              <p className="text-xs font-bold text-[#82938B]">
                DESCRIPTION
              </p>
              <p className="mt-2 text-sm leading-6">
                {selected.description || "No description provided."}
              </p>
            </div>

            {/* Worker assignment */}
            <div className="mt-6 rounded-2xl border border-[#DCE9DF] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#D6F4DF] p-3">
                  <HardHat size={21} />
                </div>
                <div>
                  <h3 className="font-bold">Assign Field Worker</h3>
                  <p className="text-xs text-[#82938B]">
                    Select a worker to handle this complaint.
                  </p>
                </div>
              </div>

              <label className="mt-4 block text-sm font-semibold">
                Available Workers
              </label>

              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#DCE9DF] bg-white px-4 py-3 text-sm outline-none focus:border-[#719487]"
              >
                <option value="">Select a worker</option>
                {workers.map((worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.full_name}
                  </option>
                ))}
              </select>

              {workers.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No worker accounts found. Check that a profile has role set to worker.
                </p>
              )}

              {assignedWorker && (
                <p className="mt-3 text-xs font-semibold text-[#34724D]">
                  A worker is already assigned to this complaint.
                </p>
              )}

              <button
                onClick={assignWorker}
                disabled={assigning || !selectedWorker || workers.length === 0}
                className="mt-4 w-full rounded-xl bg-[#173D35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#28594C] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {assigning
                  ? "Assigning..."
                  : assignedWorker
                  ? "Update Worker Assignment"
                  : "Assign Worker"}
              </button>
            </div>

            <div className="mt-6">
              <label className="text-sm font-bold">
                Update Complaint Status
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    disabled={saving || selected.status === status}
                    onClick={() => updateStatus(selected.id, status)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected.status === status
                        ? "border-[#173D35] bg-[#E8F6EC] text-[#173D35]"
                        : "border-[#E2ECE5] hover:bg-[#F7FAF7]"
                    }`}
                  >
                    {status === "Submitted" ? "Pending Review" : status}
                  </button>
                ))}
              </div>

              {saving && (
                <p className="mt-3 text-sm text-[#55766A]">
                  Updating status...
                </p>
              )}
            </div>

            <button
              onClick={() => setSelected(null)}
              className="mt-7 w-full rounded-xl bg-[#173D35] px-4 py-3 font-semibold text-white hover:bg-[#28594C]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

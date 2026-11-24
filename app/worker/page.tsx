
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardHat, MapPin, Clock, CheckCircle2, ClipboardList,
  Star, Trophy, Camera, Upload, AlertTriangle, X, CalendarDays
} from "lucide-react";
import { supabase } from "../lib/supabase";

type Task = {
  id: string;
  code: string;
  title: string;
  category: string;
  location: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  status: "Assigned" | "In Progress" | "Completed";
  description: string;
};

export default function WorkerDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [evidence, setEvidence] = useState<File | null>(null);
  const [filter, setFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setNotice("");

    // Identify the currently logged-in worker
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setNotice("Please log in to view your assigned tasks.");
      setTasks([]);
      setLoading(false);
      return;
    }

    const workerId = userData.user.id;

    // Fetch only tasks assigned to this worker
    const { data: assignments, error: assignmentError } = await supabase
      .from("worker_tasks")
      .select("complaint_id")
      .eq("worker_id", workerId);

    if (assignmentError) {
      setNotice("Could not load assignments: " + assignmentError.message);
      setTasks([]);
      setLoading(false);
      return;
    }

    const complaintIds = [
      ...new Set((assignments || []).map(item => item.complaint_id))
    ];

    if (complaintIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Fetch details only for assigned complaints
    const { data, error } = await supabase
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
        created_at
      `)
      .in("id", complaintIds)
      .in("status", ["Assigned", "In Progress", "Resolved"])
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Could not load task details: " + error.message);
      setTasks([]);
      setLoading(false);
      return;
    }

    const formattedTasks: Task[] = (data || []).map(item => ({
      id: item.id,
      code: item.complaint_code,
      title: item.title,
      category: item.category,
      location: item.location,
      date: new Date(item.created_at).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      priority: item.urgency as Task["priority"],
      status:
        item.status === "Resolved"
          ? "Completed"
          : item.status as Task["status"],
      description: item.description || "No additional instructions provided.",
    }));

    setTasks(formattedTasks);
    setLoading(false);
  }

  const assigned = tasks.filter(t => t.status === "Assigned").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const points = 30 * completed + 5 * assigned + 10 * inProgress;

  const filteredTasks = tasks.filter(
    t => filter === "All" || t.status === filter
  );

  async function updateTask(id: string, status: Task["status"]) {
    setUpdating(true);
    setNotice("");

    const databaseStatus = status === "Completed" ? "Resolved" : status;

    const { error } = await supabase
      .from("complaints")
      .update({ status: databaseStatus })
      .eq("id", id);

    if (error) {
      setNotice("Update failed: " + error.message);
      setUpdating(false);
      return;
    }

    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status } : t)
    );

    setSelected(prev =>
      prev && prev.id === id ? { ...prev, status } : prev
    );

    setNotice(
      status === "Completed"
        ? "Task marked completed and saved. It is subject to official verification."
        : `Task status updated to ${status}.`
    );

    setUpdating(false);
  }

  function submitEvidence() {
    if (!evidence) {
      setNotice("Please select a repair photo first.");
      return;
    }

    setNotice("Photo selected. Evidence upload will be enabled after Storage setup.");
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
              CIVICPULSE / WORKER
            </p>
            <h1 className="mt-2 text-3xl font-bold">Worker Dashboard</h1>
            <p className="mt-2 text-sm text-[#71847C]">
              Your work makes your city a better place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#E2ECE5] bg-white px-4 py-3">
            <div className="rounded-xl bg-[#D6F4DF] p-2">
              <HardHat size={22} />
            </div>
            <div>
              <p className="text-sm font-bold">Field Worker</p>
              <p className="text-xs text-[#82938B]">CivicPulse Team</p>
            </div>
          </div>
        </header>

        <section className="mb-7 rounded-3xl bg-[#173D35] p-7 text-white">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#C3DCCF]">WELCOME BACK</p>
              <h2 className="mt-2 text-3xl font-bold">Hello, Worker!</h2>
              <p className="mt-2 text-sm text-[#D2E4D9]">
                Every completed task brings a positive change to your community.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <HardHat size={42} />
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <div className="rounded-xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-bold">{completed}</p>
              <p className="text-xs text-[#C3DCCF]">Tasks completed</p>
            </div>
            <div className="rounded-xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-bold">{inProgress}</p>
              <p className="text-xs text-[#C3DCCF]">In progress</p>
            </div>
            <div className="rounded-xl bg-white/10 px-5 py-3">
              <p className="text-2xl font-bold">{points}</p>
              <p className="text-xs text-[#C3DCCF]">Demo points</p>
            </div>
          </div>
        </section>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Assigned Tasks", value: assigned, icon: ClipboardList, bg: "bg-[#E5F0EB]" },
            { label: "In Progress", value: inProgress, icon: Clock, bg: "bg-[#FFF0D9]" },
            { label: "Completed", value: completed, icon: CheckCircle2, bg: "bg-[#DFF4E4]" },
            { label: "Worker Points", value: points, icon: Star, bg: "bg-[#F1EAFB]" },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-[#E2ECE5] bg-white p-5 shadow-sm">
              <div className={`mb-4 inline-flex rounded-xl p-3 ${item.bg}`}>
                <item.icon size={22} />
              </div>
              <p className="text-3xl font-bold">{item.value}</p>
              <p className="mt-1 text-sm text-[#71847C]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-7 grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#D6F4DF] p-3">
                <Trophy size={22} />
              </div>
              <div>
                <h3 className="font-bold">Worker Performance</h3>
                <p className="text-xs text-[#82938B]">Your contribution summary</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-[#F7FAF7] p-4">
                <p className="text-2xl font-bold">{completed}</p>
                <p className="mt-1 text-xs text-[#82938B]">Completed tasks</p>
              </div>
              <div className="rounded-xl bg-[#F7FAF7] p-4">
                <p className="text-2xl font-bold">—</p>
                <p className="mt-1 text-xs text-[#82938B]">Worker feedback</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#FFF0D9] p-3">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="font-bold">Priority Reminder</h3>
                <p className="text-xs text-[#82938B]">Tasks needing attention</p>
              </div>
            </div>
            <p className="mt-5 text-3xl font-bold">
              {tasks.filter(t => t.priority === "High" && t.status !== "Completed").length}
            </p>
            <p className="mt-1 text-sm text-[#71847C]">High priority active tasks</p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#E2ECE5] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">My Assigned Tasks</h2>
              <p className="mt-1 text-sm text-[#82938B]">
                Select a task to view details and update progress.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadTasks}
                className="rounded-xl border border-[#DCE9DF] px-3 py-2 text-sm font-semibold hover:bg-[#F7FAF7]"
              >
                Refresh
              </button>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="rounded-xl border border-[#DCE9DF] bg-white px-3 py-3 text-sm outline-none"
              >
                {["All", "Assigned", "In Progress", "Completed"].map(s => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-center text-sm text-[#82938B]">
              Loading tasks...
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => {
                    setSelected(task);
                    setEvidence(null);
                    setNotice("");
                  }}
                  className="w-full rounded-2xl border border-[#E8EFEA] p-4 text-left transition hover:border-[#9ABDA7] hover:bg-[#F8FBF8]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#82938B]">
                          {task.code}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          task.priority === "High" ? "bg-red-50 text-red-700" :
                          task.priority === "Medium" ? "bg-amber-50 text-amber-700" :
                          "bg-green-50 text-green-700"
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                      <h3 className="mt-2 font-bold">{task.title}</h3>
                      <p className="mt-2 flex items-center gap-1 text-xs text-[#82938B]">
                        <MapPin size={13} /> {task.location}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span className="rounded-full bg-[#E8F6EC] px-3 py-1.5 text-xs font-semibold text-[#34724D]">
                        {task.status}
                      </span>
                      <span className="text-xs font-semibold text-[#55766A]">
                        View task →
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {filteredTasks.length === 0 && (
                <p className="py-10 text-center text-sm text-[#82938B]">
                  No tasks assigned to your account yet.
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
                <p className="text-xs font-bold text-[#82938B]">{selected.code}</p>
                <h2 className="mt-2 text-2xl font-bold">{selected.title}</h2>
                <p className="mt-2 text-sm text-[#71847C]">{selected.location}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl bg-[#F7FAF7] p-4">
              <p className="text-xs font-semibold text-[#82938B]">
                REPAIR INSTRUCTIONS
              </p>
              <p className="mt-2 text-sm leading-6">{selected.description}</p>
              <p className="mt-3 flex items-center gap-2 text-xs text-[#82938B]">
                <CalendarDays size={14} /> Reported date: {selected.date}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold">Update Task Progress</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["Assigned", "In Progress", "Completed"] as const).map(status => (
                  <button
                    key={status}
                    disabled={updating}
                    onClick={() => updateTask(selected.id, status)}
                    className={`rounded-xl border px-3 py-3 text-sm font-semibold disabled:opacity-50 ${
                      selected.status === status
                        ? "border-[#173D35] bg-[#E8F6EC] text-[#173D35]"
                        : "border-[#E2ECE5] hover:bg-[#F7FAF7]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold">Upload Repair Evidence</p>
              <label className="mt-3 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[#BBD3C2] bg-[#F8FBF8] p-6 text-center hover:bg-[#F0F7F1]">
                <Camera size={28} className="text-[#719487]" />
                <span className="mt-2 text-sm font-semibold">
                  Choose a repair photo
                </span>
                <span className="mt-1 text-xs text-[#82938B]">
                  Select an image from your device
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setEvidence(e.target.files?.[0] || null)}
                />
              </label>

              {evidence && (
                <p className="mt-2 text-xs font-semibold text-[#34724D]">
                  Selected: {evidence.name}
                </p>
              )}

              <button
                onClick={submitEvidence}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#DCE9DF] px-4 py-3 text-sm font-semibold hover:bg-[#F7FAF7]"
              >
                <Upload size={17} /> Submit Evidence
              </button>
              <p className="mt-2 text-xs text-[#82938B]">
                Evidence upload will be enabled after Storage setup.
              </p>
            </div>

            {notice && (
              <p className="mt-4 break-words rounded-xl bg-[#E8F6EC] p-3 text-sm text-[#34724D]">
                {notice}
              </p>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-6 w-full rounded-xl bg-[#173D35] px-4 py-3 font-semibold text-white hover:bg-[#28594C]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

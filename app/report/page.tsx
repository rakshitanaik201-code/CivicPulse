
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Camera, MapPin, LocateFixed, Upload,
  Trash2, CheckCircle2, AlertCircle, FileText,
  Lightbulb, Droplets, Construction, Trash, Waves, CircleHelp
} from "lucide-react";
import { supabase } from "../lib/supabase";

const categories = [
  { name: "Road Damage", icon: Construction, color: "#FCE7D5", text: "#B85C16", department: "Road Maintenance" },
  { name: "Garbage", icon: Trash, color: "#E1F3D9", text: "#397A35", department: "Waste Management" },
  { name: "Streetlight", icon: Lightbulb, color: "#FFF1C9", text: "#A16A00", department: "Streetlight Department" },
  { name: "Water Leakage", icon: Droplets, color: "#DCEEFF", text: "#2671B5", department: "Water Supply" },
  { name: "Drainage", icon: Waves, color: "#EAE2FF", text: "#7150AE", department: "Drainage Department" },
  { name: "Other", icon: CircleHelp, color: "#F0E8E1", text: "#82634F", department: "General Administration" },
];

export default function ReportPage() {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [urgency, setUrgency] = useState("Medium");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [complaintId, setComplaintId] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedCategory = categories.find((c) => c.name === category);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Please upload a JPG or PNG image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    if (photo) URL.revokeObjectURL(photo);

    setPhotoFile(file);
    setPhoto(URL.createObjectURL(file));
    setErrorMessage("");
  }

  function removePhoto() {
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setPhotoFile(null);
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      alert("Location detection is not supported by your browser.");
      return;
    }

    setDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const long = position.coords.longitude;

        setLatitude(lat);
        setLongitude(long);
        setLocation(`${lat.toFixed(5)}, ${long.toFixed(5)}`);
        setDetectingLocation(false);
      },
      (error) => {
        setDetectingLocation(false);

        if (error.code === error.PERMISSION_DENIED) {
          alert("Location permission denied. Please allow location access in your browser.");
        } else {
          alert("Could not detect location. Please try again or enter it manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  async function submitReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!category || !title.trim() || !description.trim() || !location.trim()) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if ((latitude === null) !== (longitude === null)) {
      setErrorMessage("GPS coordinates are incomplete. Please detect your location again.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      if (!userData.user) {
        throw new Error("Please log in again before submitting your report.");
      }

      const { data: departmentData, error: departmentError } =
        await supabase
          .from("departments")
          .select("id")
          .eq("name", selectedCategory!.department)
          .single();

      if (departmentError) {
        throw new Error(`Department lookup failed: ${departmentError.message}`);
      }

      if (!departmentData) {
        throw new Error(`Department not found: ${selectedCategory!.department}`);
      }

      let photoUrl: string | null = null;

      if (photoFile) {
        const fileExtension = photoFile.type === "image/png" ? "png" : "jpg";
        const filePath = `${userData.user.id}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from("complaint-photos")
          .upload(filePath, photoFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: photoFile.type,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from("complaint-photos")
          .getPublicUrl(filePath);

        photoUrl = publicUrlData.publicUrl;
      }

      const newComplaintCode = "CP" + Date.now().toString().slice(-8);

      const { data: complaintData, error: insertError } =
        await supabase
          .from("complaints")
          .insert({
            complaint_code: newComplaintCode,
            citizen_id: userData.user.id,
            department_id: departmentData.id,
            title: title.trim(),
            description: description.trim(),
            category,
            location: location.trim(),
            latitude,
            longitude,
            urgency,
            photo_url: photoUrl,
          })
          .select("complaint_code")
          .single();

      if (insertError) {
        throw new Error(`Complaint database insert failed: ${insertError.message}`);
      }

      if (!complaintData) {
        throw new Error("Complaint was not returned by the database.");
      }

      setComplaintId(complaintData.complaint_code);

    } catch (error: unknown) {
      console.error("FULL COMPLAINT SUBMISSION ERROR:", error);

      const err = error as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };

      const message = [
        err?.message || "Unknown submission error",
        err?.details ? `Details: ${err.details}` : "",
        err?.hint ? `Hint: ${err.hint}` : "",
        err?.code ? `Code: ${err.code}` : "",
      ].filter(Boolean).join(" | ");

      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (complaintId) {
    return (
      <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl p-10 text-center border border-green-100">
          <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-[#D6F4DF] flex items-center justify-center">
            <CheckCircle2 size={42} className="text-[#173D35]" />
          </div>
          <h1 className="text-3xl font-bold text-[#173D35]">Report submitted!</h1>
          <p className="text-gray-500 mt-3">Thank you for speaking up for your city.</p>
          <div className="bg-[#F0F8F1] rounded-2xl p-5 mt-7">
            <p className="text-sm text-gray-500">Your complaint ID</p>
            <p className="text-2xl font-bold text-[#173D35] mt-1">{complaintId}</p>
          </div>
          <p className="text-sm text-gray-500 mt-5">
            Your report is awaiting validation. Civic points will be awarded after verification.
          </p>
          <Link href="/" className="mt-7 block w-full bg-[#173D35] text-white rounded-xl py-3 font-semibold hover:bg-[#24594C]">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-gray-800">
      <header className="bg-[#173D35] text-white px-6 py-5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2 text-sm text-green-200 hover:text-white mb-2">
              <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold">
              CivicPulse <span className="text-green-300">/</span> Report an Issue
            </h1>
            <p className="text-green-100 text-sm mt-1">Your city. Your voice. Your impact.</p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/10 items-center justify-center">
            <FileText size={25} className="text-green-200" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-9 grid lg:grid-cols-[1fr_310px] gap-8">
        <form onSubmit={submitReport} className="space-y-6">

          <section className="bg-white rounded-3xl border border-green-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-xl bg-[#D6F4DF] flex items-center justify-center text-[#173D35] font-bold">01</span>
              <div>
                <h2 className="text-xl font-bold text-[#173D35]">What's the issue?</h2>
                <p className="text-sm text-gray-500">Choose the category that best describes it.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((item) => {
                const Icon = item.icon;
                const active = category === item.name;

                return (
                  <button key={item.name} type="button" onClick={() => setCategory(item.name)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all hover:-translate-y-1 hover:shadow-md ${active ? "border-[#173D35] bg-[#F0F8F1] shadow-sm" : "border-gray-100 bg-white hover:border-green-200"}`}>
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: item.color, color: item.text }}>
                      <Icon size={23} />
                    </span>
                    <span className="font-semibold text-sm block">{item.name}</span>
                    {active && <span className="text-xs text-[#397A35] font-semibold mt-1 block">✓ Selected</span>}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-green-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-xl bg-[#E8E3FF] flex items-center justify-center text-[#7150AE] font-bold">02</span>
              <div>
                <h2 className="text-xl font-bold text-[#173D35]">Describe the problem</h2>
                <p className="text-sm text-gray-500">Give us enough details to understand it.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold mb-2">Issue title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required
              placeholder="e.g. Large pothole near the bus stop"
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-200 focus:border-[#397A35]" />

            <label className="block text-sm font-semibold mt-5 mb-2">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={4} required
              placeholder="Describe where it is, how serious it is and how it affects people..."
              className="w-full border border-gray-200 rounded-xl p-3 outline-none resize-none focus:ring-2 focus:ring-green-200 focus:border-[#397A35]" />
            <p className="text-xs text-gray-400 text-right mt-1">{description.length}/500 characters</p>
          </section>

          <section className="bg-white rounded-3xl border border-green-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-xl bg-[#FFE8DD] flex items-center justify-center text-[#B85C35] font-bold">03</span>
              <div>
                <h2 className="text-xl font-bold text-[#173D35]">Add photo evidence</h2>
                <p className="text-sm text-gray-500">A picture helps officials understand the issue.</p>
              </div>
            </div>

            <label className="block cursor-pointer border-2 border-dashed border-green-200 bg-[#F7FBF7] hover:bg-[#EFF8F0] rounded-2xl p-7 text-center transition-colors">
              {photo ? (
                <div className="space-y-3">
                  <img src={photo} alt="Issue preview" className="max-h-56 mx-auto rounded-xl object-cover" />
                  <span className="text-sm text-[#397A35] font-semibold">Photo selected — click to change</span>
                </div>
              ) : (
                <>
                  <span className="w-14 h-14 bg-[#D6F4DF] text-[#173D35] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Camera size={27} />
                  </span>
                  <p className="font-semibold text-[#173D35]">Click to upload a photo</p>
                  <p className="text-xs text-gray-500 mt-2">JPG or PNG · Maximum 5 MB</p>
                  <span className="inline-flex items-center gap-2 mt-4 bg-[#173D35] text-white rounded-lg px-4 py-2 text-sm font-semibold">
                    <Upload size={15} /> Choose photo
                  </span>
                </>
              )}
              <input type="file" accept="image/jpeg,image/png" onChange={handlePhoto} className="hidden" />
            </label>

            {photo && (
              <button type="button" onClick={removePhoto} className="text-sm text-red-500 mt-3 flex items-center gap-1">
                <Trash2 size={15} /> Remove photo
              </button>
            )}
            <p className="text-xs text-gray-400 mt-3">Your photo will be securely uploaded when you submit the report.</p>
          </section>

          <section className="bg-white rounded-3xl border border-green-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-xl bg-[#DCEEFF] flex items-center justify-center text-[#2671B5] font-bold">04</span>
              <div>
                <h2 className="text-xl font-bold text-[#173D35]">Where is it?</h2>
                <p className="text-sm text-gray-500">Help us locate the problem accurately.</p>
              </div>
            </div>

            <label className="block text-sm font-semibold mb-2">Issue location *</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input value={location} onChange={(e) => {
                setLocation(e.target.value);
                setLatitude(null);
                setLongitude(null);
              }} placeholder="Enter area, street or landmark" required
                className="flex-1 min-w-0 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-200" />
              <button type="button" onClick={detectLocation} disabled={detectingLocation}
                className="flex items-center justify-center gap-2 bg-[#E8F4FF] text-[#2671B5] rounded-xl px-4 py-3 font-semibold text-sm hover:bg-blue-100 disabled:opacity-60">
                <LocateFixed size={17} /> {detectingLocation ? "Detecting..." : "Detect GPS"}
              </button>
            </div>

            {latitude !== null && longitude !== null ? (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <p className="font-semibold flex items-center gap-2"><CheckCircle2 size={18} /> GPS location attached successfully!</p>
                <p className="text-xs mt-2">Latitude: {latitude.toFixed(6)}</p>
                <p className="text-xs">Longitude: {longitude.toFixed(6)}</p>
                <p className="text-xs mt-2">These coordinates will be saved with your complaint and can be shown on the Community Map.</p>
              </div>
            ) : (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-semibold flex items-center gap-2"><AlertCircle size={18} /> GPS location not attached</p>
                <p className="text-xs mt-1">Your typed address will still be saved, but the complaint will not have exact map coordinates. Click Detect GPS to attach them.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-3xl border border-green-100 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-10 h-10 rounded-xl bg-[#FFF1C9] flex items-center justify-center text-[#A16A00] font-bold">05</span>
              <div>
                <h2 className="text-xl font-bold text-[#173D35]">How urgent is it?</h2>
                <p className="text-sm text-gray-500">Select the seriousness of the issue.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { name: "Low", bg: "#E1F3D9", color: "#397A35", ring: "border-green-500" },
                { name: "Medium", bg: "#FFF1C9", color: "#A16A00", ring: "border-amber-500" },
                { name: "High", bg: "#FCE1E1", color: "#B83232", ring: "border-red-500" },
              ].map((item) => (
                <button key={item.name} type="button" onClick={() => setUrgency(item.name)}
                  className={`rounded-xl border-2 py-4 font-bold transition-all ${urgency === item.name ? item.ring + " shadow-sm" : "border-gray-100"}`}
                  style={{ backgroundColor: item.bg, color: item.color }}>
                  {item.name}
                  {urgency === item.name && <span className="block text-xs mt-1">✓ Selected</span>}
                </button>
              ))}
            </div>
          </section>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm break-words">
              <p className="font-bold mb-1">Submission failed</p>
              {errorMessage}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full bg-[#173D35] hover:bg-[#24594C] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl py-4 text-lg font-bold shadow-lg shadow-green-900/10 transition-all hover:-translate-y-0.5">
            {submitting ? "Submitting your report..." : "Submit Civic Report →"}
          </button>

          <p className="text-center text-xs text-gray-400">Your report will be reviewed before civic points are awarded.</p>
        </form>

        <aside className="space-y-5">
          <div className="bg-[#173D35] text-white rounded-3xl p-6 shadow-lg">
            <span className="text-3xl">🌱</span>
            <h3 className="text-xl font-bold mt-3">Small action. Big impact.</h3>
            <p className="text-green-100 text-sm mt-2 leading-relaxed">
              Every genuine report brings us one step closer to a cleaner, safer and better Bengaluru.
            </p>
            <div className="border-t border-white/20 mt-5 pt-4 flex items-center gap-2 text-sm text-green-200">
              <CheckCircle2 size={17} /> Your voice matters.
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-green-100 p-6 shadow-sm">
            <h3 className="font-bold text-[#173D35] flex items-center gap-2">
              <AlertCircle size={19} className="text-amber-500" /> Before you report
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-600">
              <li className="flex gap-2"><CheckCircle2 size={17} className="text-green-600 shrink-0" /> Check whether someone has already reported this issue.</li>
              <li className="flex gap-2"><CheckCircle2 size={17} className="text-green-600 shrink-0" /> Add a clear and recent photo.</li>
              <li className="flex gap-2"><CheckCircle2 size={17} className="text-green-600 shrink-0" /> Provide an accurate location.</li>
              <li className="flex gap-2"><CheckCircle2 size={17} className="text-green-600 shrink-0" /> Report genuine civic issues only.</li>
            </ul>
          </div>

          <div className="bg-[#EAF5EB] rounded-3xl p-6 border border-green-100">
            <p className="text-xs font-bold uppercase tracking-wider text-[#397A35]">Suggested department</p>
            <p className="font-bold text-[#173D35] mt-2">
              {selectedCategory ? selectedCategory.department : "Select an issue category"}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              This is an initial suggestion. Final assignment requires official review.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

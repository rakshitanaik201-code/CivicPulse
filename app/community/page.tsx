
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Lightbulb,
  Droplets,
  Construction,
  Filter,
  X,
  Loader2,
  Navigation,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "../lib/supabase";
import "leaflet/dist/leaflet.css";

type Issue = {
  id: string;
  complaint_code: string;
  title: string;
  category: string;
  location: string;
  status: string;
  created_at: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

function getDisplayStatus(status: string) {
  if (status === "Resolved") return "Resolved";
  if (status === "In Progress") return "In Progress";
  if (status === "Rejected") return "Rejected";
  return "Pending";
}

function getStatusColor(status: string) {
  const value = getDisplayStatus(status);
  if (value === "Resolved") return "#397A35";
  if (value === "In Progress") return "#438AC1";
  if (value === "Rejected") return "#8B8B8B";
  return "#E9A23B";
}

function getCategoryIcon(category: string): LucideIcon {
  const value = category.toLowerCase();

  if (value.includes("garbage") || value.includes("waste")) return Trash2;
  if (value.includes("streetlight") || value.includes("light")) return Lightbulb;
  if (value.includes("water") || value.includes("leak")) return Droplets;

  return Construction;
}

function formatDate(date: string) {
  const value = new Date(date);

  if (Number.isNaN(value.getTime())) return "Date unavailable";

  return value.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CommunityMap({
  issues,
  onSelect,
}: {
  issues: Issue[];
  onSelect: (issue: Issue) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerLayerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const onSelectRef = useRef(onSelect);

  const [ready, setReady] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!mapElement.current || mapRef.current) return;

      const L = await import("leaflet");

      if (cancelled || !mapElement.current) return;

      leafletRef.current = L;

      const map = L.map(mapElement.current, {
        center: [12.9716, 77.5946],
        zoom: 11,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    }

    initializeMap();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerLayerRef.current = null;
        userMarkerRef.current = null;
      }
    };
  }, []);

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support GPS location.");
      return;
    }

    setLocating(true);
    setLocationMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setUserLocation(location);
        setLocating(false);
        setLocationMessage("Your current location is shown on the map.");

        if (mapRef.current) {
          mapRef.current.setView(
            [location.latitude, location.longitude],
            16
          );
        }
      },
      (error) => {
        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage(
            "Location permission was denied. Allow location access in your browser settings."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationMessage("Your current location is unavailable.");
        } else {
          setLocationMessage("Location request timed out. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  useEffect(() => {
    if (!ready || !leafletRef.current || !mapRef.current || !userLocation) {
      return;
    }

    const L = leafletRef.current;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const userIcon = L.divIcon({
      className: "",
      html: `
        <div style="
          width:22px;
          height:22px;
          background:#2878E5;
          border:4px solid white;
          border-radius:50%;
          box-shadow:0 0 0 7px rgba(40,120,229,.22), 0 2px 8px rgba(0,0,0,.35);
        "></div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    userMarkerRef.current = L.marker(
      [userLocation.latitude, userLocation.longitude],
      { icon: userIcon }
    )
      .addTo(mapRef.current)
      .bindTooltip("Your current location");
  }, [ready, userLocation]);

  // Complaint markers with clickable information popups
  useEffect(() => {
    if (!ready || !leafletRef.current || !markerLayerRef.current) return;

    const L = leafletRef.current;
    const layer = markerLayerRef.current;

    layer.clearLayers();

    const locatedIssues = issues.filter((issue) => {
      return (
        issue.latitude !== null &&
        issue.longitude !== null &&
        Number.isFinite(Number(issue.latitude)) &&
        Number.isFinite(Number(issue.longitude)) &&
        Math.abs(Number(issue.latitude)) <= 90 &&
        Math.abs(Number(issue.longitude)) <= 180
      );
    });

    locatedIssues.forEach((issue) => {
      const color = getStatusColor(issue.status);
      const displayStatus = getDisplayStatus(issue.status);

      const markerIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:34px;
          height:34px;
          background:${color};
          border:3px solid white;
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          box-shadow:0 2px 8px rgba(0,0,0,.3);
          display:flex;
          align-items:center;
          justify-content:center;
        "><div style="
          width:8px;
          height:8px;
          background:white;
          border-radius:50%;
        "></div></div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const marker = L.marker(
        [Number(issue.latitude), Number(issue.longitude)],
        { icon: markerIcon }
      );

      // Create popup safely using textContent
      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "190px";
      popupContent.style.padding = "4px";

      const title = document.createElement("h3");
      title.textContent = issue.title;
      title.style.fontWeight = "700";
      title.style.fontSize = "14px";
      title.style.color = "#173D35";
      title.style.marginBottom = "8px";

      const complaintCode = document.createElement("p");
      complaintCode.textContent = issue.complaint_code;
      complaintCode.style.fontSize = "11px";
      complaintCode.style.color = "#777";
      complaintCode.style.marginBottom = "6px";

      const status = document.createElement("p");
      status.textContent = `Status: ${displayStatus}`;
      status.style.fontSize = "12px";
      status.style.fontWeight = "600";
      status.style.color = color;
      status.style.marginBottom = "6px";

      const location = document.createElement("p");
      location.textContent = `Location: ${issue.location}`;
      location.style.fontSize = "12px";
      location.style.color = "#555";
      location.style.marginBottom = "10px";

      const viewButton = document.createElement("button");
      viewButton.textContent = "View Details";
      viewButton.type = "button";
      viewButton.style.background = "#173D35";
      viewButton.style.color = "white";
      viewButton.style.border = "none";
      viewButton.style.borderRadius = "8px";
      viewButton.style.padding = "8px 12px";
      viewButton.style.fontSize = "12px";
      viewButton.style.fontWeight = "600";
      viewButton.style.cursor = "pointer";
      viewButton.style.width = "100%";

      viewButton.addEventListener("click", () => {
        onSelectRef.current(issue);
        mapRef.current?.closePopup();
      });

      popupContent.appendChild(title);
      popupContent.appendChild(complaintCode);
      popupContent.appendChild(status);
      popupContent.appendChild(location);
      popupContent.appendChild(viewButton);

      marker.bindPopup(popupContent);
      marker.addTo(layer);
    });
  }, [issues, ready]);

  const locatedCount = issues.filter(
    (issue) =>
      issue.latitude !== null &&
      issue.longitude !== null &&
      Number.isFinite(Number(issue.latitude)) &&
      Number.isFinite(Number(issue.longitude)) &&
      Math.abs(Number(issue.latitude)) <= 90 &&
      Math.abs(Number(issue.longitude)) <= 180
  ).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <p className="text-sm font-medium text-[#173D35]">
          Find your location on the map
        </p>

        <button
          onClick={locateMe}
          disabled={locating}
          className="flex items-center justify-center gap-2 bg-[#173D35] text-white rounded-xl px-4 py-2.5 text-sm font-semibold hover:bg-[#24594C] disabled:opacity-60"
        >
          {locating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Navigation size={16} />
          )}
          {locating ? "Locating..." : "Locate Me"}
        </button>
      </div>

      {locationMessage && (
        <p className="text-xs text-blue-700 bg-blue-50 rounded-xl p-3 mb-3">
          {locationMessage}
        </p>
      )}

      <div
        ref={mapElement}
        className="w-full h-[420px] rounded-2xl z-0"
        style={{ background: "#EAF2E8" }}
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          <MapPin size={13} className="inline mr-1" />
          {locatedCount} of {issues.length} reports have GPS locations
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Your Location
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E9A23B]" />
            Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#438AC1]" />
            In Progress
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#397A35]" />
            Resolved
          </span>
        </div>
      </div>

      {locatedCount === 0 && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-xl p-3">
          No reports have GPS coordinates yet. Reports will appear as map
          markers when latitude and longitude are saved.
        </p>
      )}
    </div>
  );
}

export default function CommunityPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchIssues() {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("complaints")
        .select(
          "id, complaint_code, title, category, location, status, created_at, description, latitude, longitude"
        )
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setIssues([]);
      } else {
        setIssues((data || []) as Issue[]);
      }

      setLoading(false);
    }

    fetchIssues();
  }, []);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const searchValue = search.toLowerCase();

      const matchesSearch =
        issue.title.toLowerCase().includes(searchValue) ||
        issue.location.toLowerCase().includes(searchValue) ||
        issue.category.toLowerCase().includes(searchValue) ||
        issue.complaint_code.toLowerCase().includes(searchValue);

      const displayStatus = getDisplayStatus(issue.status);
      const matchesFilter = filter === "All" || displayStatus === filter;

      return matchesSearch && matchesFilter;
    });
  }, [issues, search, filter]);

  const totalIssues = issues.length;
  const pendingCount = issues.filter(
    (issue) => getDisplayStatus(issue.status) === "Pending"
  ).length;
  const progressCount = issues.filter(
    (issue) => issue.status === "In Progress"
  ).length;
  const resolvedCount = issues.filter(
    (issue) => issue.status === "Resolved"
  ).length;

  return (
    <main className="min-h-screen bg-[#F7FAF7] text-gray-800">
      <header className="bg-[#173D35] text-white px-6 py-6 shadow-md">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-green-200 hover:text-white mb-4"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Community Map
              </h1>
              <p className="text-green-100 text-sm mt-2">
                Explore civic issues and make your neighbourhood better.
              </p>
            </div>

            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
              <MapPin size={20} className="text-green-200" />
              <div>
                <p className="text-xs text-green-200">Your city</p>
                <p className="font-semibold text-sm">Bengaluru</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Issues", value: totalIssues, color: "#173D35" },
            { label: "Pending", value: pendingCount, color: "#C17B20" },
            { label: "In Progress", value: progressCount, color: "#438AC1" },
            { label: "Resolved", value: resolvedCount, color: "#397A35" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-green-100 rounded-2xl p-4 shadow-sm"
            >
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p
                className="text-2xl font-bold mt-2"
                style={{ color: stat.color }}
              >
                {stat.value.toString().padStart(2, "0")}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-white border border-green-100 rounded-3xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
            <div>
              <h2 className="font-bold text-xl text-[#173D35]">
                Explore local issues
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Find reports shared by your community.
              </p>
            </div>

            <Link
              href="/report"
              className="bg-[#173D35] text-white rounded-xl px-4 py-3 text-sm font-semibold text-center hover:bg-[#24594C] transition"
            >
              + Report an issue
            </Link>
          </div>

          <div className="relative mb-4">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by issue, category, complaint ID or area..."
              className="w-full border border-green-100 bg-[#FAFCFA] rounded-xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {["All", "Pending", "In Progress", "Resolved"].map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  filter === item
                    ? "bg-[#173D35] text-white"
                    : "bg-[#F0F5F0] text-gray-600 hover:bg-green-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden border border-green-100">
            <CommunityMap
              issues={filteredIssues}
              onSelect={setSelectedIssue}
            />
          </div>

          <p className="text-xs text-gray-400 mt-3">
            Map data © OpenStreetMap contributors. Only saved GPS coordinates
            are used for complaint markers.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[#173D35]">
                Reported nearby
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select an issue to see more details.
              </p>
            </div>
            <Filter size={19} className="text-[#397A35]" />
          </div>

          {loading && (
            <div className="bg-white rounded-2xl p-8 text-center border border-green-100">
              <Loader2
                size={28}
                className="mx-auto text-[#173D35] animate-spin"
              />
              <p className="text-sm text-gray-500 mt-3">
                Loading community reports...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700">
              <p className="font-semibold">
                Unable to load community reports.
              </p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredIssues.map((issue) => {
                  const Icon = getCategoryIcon(issue.category);

                  return (
                    <button
                      key={issue.id}
                      onClick={() => setSelectedIssue(issue)}
                      className="text-left bg-white border border-green-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${getStatusColor(issue.status)}20`,
                            color: getStatusColor(issue.status),
                          }}
                        >
                          <Icon size={23} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <h3 className="font-bold text-[#173D35]">
                              {issue.title}
                            </h3>
                            <span
                              className="text-[10px] px-2 py-1 rounded-full font-semibold h-fit whitespace-nowrap"
                              style={{
                                backgroundColor: `${getStatusColor(issue.status)}20`,
                                color: getStatusColor(issue.status),
                              }}
                            >
                              {getDisplayStatus(issue.status)}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <MapPin size={13} /> {issue.location}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {issue.complaint_code} • {formatDate(issue.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredIssues.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center border border-green-100">
                  <AlertCircle size={28} className="mx-auto text-gray-400" />
                  <p className="font-semibold text-[#173D35] mt-3">
                    No issues found
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Try another search or filter.
                  </p>
                </div>
              )}
            </>
          )}
        </section>

        {selectedIssue && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl relative">
              <button
                onClick={() => setSelectedIssue(null)}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100"
                aria-label="Close issue details"
              >
                <X size={19} />
              </button>

              {(() => {
                const Icon = getCategoryIcon(selectedIssue.category);

                return (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      backgroundColor: `${getStatusColor(selectedIssue.status)}20`,
                      color: getStatusColor(selectedIssue.status),
                    }}
                  >
                    <Icon size={24} />
                  </div>
                );
              })()}

              <p className="text-xs font-semibold text-green-700">
                {selectedIssue.complaint_code}
              </p>
              <h2 className="text-xl font-bold text-[#173D35] mt-1">
                {selectedIssue.title}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {selectedIssue.category}
              </p>
              <p className="text-sm text-gray-500 mt-3">
                {selectedIssue.description ||
                  "No additional description provided."}
              </p>

              <div className="mt-5 space-y-3 text-sm">
                <p className="flex items-center gap-2">
                  <MapPin size={16} /> {selectedIssue.location}
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={16} /> Reported{" "}
                  {formatDate(selectedIssue.created_at)}
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> Status:{" "}
                  {getDisplayStatus(selectedIssue.status)}
                </p>
                {selectedIssue.latitude !== null &&
                  selectedIssue.longitude !== null && (
                    <p className="text-xs text-gray-500">
                      GPS: {selectedIssue.latitude},{" "}
                      {selectedIssue.longitude}
                    </p>
                  )}
              </div>

              <button
                onClick={() => setSelectedIssue(null)}
                className="w-full mt-6 bg-[#173D35] text-white rounded-xl py-3 font-semibold hover:bg-[#24594C]"
              >
                Close details
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

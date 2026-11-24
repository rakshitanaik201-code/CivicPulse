
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setMessage("Passwords do not match!");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setMessage("Password updated successfully!");

      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#173D35] rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-bold">
            C
          </div>

          <h1 className="text-3xl font-bold text-[#173D35] mt-4">
            CivicPulse
          </h1>

          <p className="text-gray-500 mt-2">
            Your city. Your voice.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-[#173D35]">
          Create new password
        </h2>

        <p className="text-gray-500 text-sm mt-2 mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleReset} className="space-y-4">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full border border-gray-200 rounded-xl p-3 pr-12 outline-none focus:ring-2 focus:ring-[#55766A]"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>

            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#55766A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#173D35] text-white font-semibold py-3 rounded-xl hover:bg-[#245448] transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

        </form>

        {message && (
          <p className="mt-5 text-sm text-center text-[#173D35]">
            {message}
          </p>
        )}

      </div>
    </main>
  );
}

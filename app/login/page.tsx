
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

type Role = "citizen" | "official" | "worker";

export default function LoginPage() {
  const router = useRouter();

  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("citizen");

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: "http://172.16.12.75:3000/reset-password",
          }
        );

        if (error) throw error;

        setMessage(
          "Password reset link sent! Please check your email."
        );
      } else if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage(
            "Account created! Please verify your email before logging in."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Verify the actual role stored in Supabase
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          throw new Error("Unable to verify your account role. Please contact an administrator.");
        }

        if (profile.role !== selectedRole) {
          await supabase.auth.signOut();
          throw new Error(
            `This account is registered as ${profile.role}. Please select the correct role.`
          );
        }

        const dashboardRoutes: Record<Role, string> = {
          citizen: "/",
          official: "/official",
          worker: "/worker",
        };

        router.push(dashboardRoutes[selectedRole]);
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const roles: { value: Role; label: string; icon: string }[] = [
    { value: "citizen", label: "Citizen", icon: "👤" },
    { value: "official", label: "Official", icon: "🏛️" },
    { value: "worker", label: "Worker", icon: "🦺" },
  ];

  return (
    <main className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">

        <Link
          href="/"
          className="text-sm font-semibold text-[#55766A] hover:text-[#173D35]"
        >
          ← Back to CivicPulse
        </Link>

        <div className="text-center mt-8 mb-8">
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
          {isForgotPassword
            ? "Reset your password"
            : isSignup
            ? "Create your account"
            : "Welcome back!"}
        </h2>

        <p className="text-gray-500 text-sm mt-2 mb-6">
          {isForgotPassword
            ? "Enter your email to receive a password reset link."
            : isSignup
            ? "Join your community and make a difference."
            : "Login to continue to your CivicPulse account."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Role Selection */}
          {!isSignup && !isForgotPassword && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Login As
              </label>

              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.value);
                      setMessage("");
                    }}
                    className={`border rounded-xl p-3 text-center transition ${
                      selectedRole === role.value
                        ? "border-[#173D35] bg-[#D6F4DF] text-[#173D35] ring-1 ring-[#173D35]"
                        : "border-gray-200 text-gray-600 hover:border-[#55766A]"
                    }`}
                  >
                    <span className="block text-2xl mb-1">
                      {role.icon}
                    </span>
                    <span className="text-sm font-semibold">
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isSignup && !isForgotPassword && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>

              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#55766A]"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#55766A]"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full border border-gray-200 rounded-xl p-3 pr-12 outline-none focus:ring-2 focus:ring-[#55766A]"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>
          )}

          {!isSignup && !isForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setMessage("");
                }}
                className="text-sm font-semibold text-[#477A65] hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#173D35] text-white font-semibold py-3 rounded-xl hover:bg-[#245448] transition disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isForgotPassword
              ? "Send Reset Link"
              : isSignup
              ? "Create Account"
              : "Login"}
          </button>

        </form>

        {message && (
          <p className="mt-5 text-sm text-center text-[#173D35] break-words">
            {message}
          </p>
        )}

        <div className="text-center mt-6 text-sm text-gray-600">

          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setMessage("");
              }}
              className="font-bold text-[#173D35] hover:underline"
            >
              ← Back to Login
            </button>
          ) : (
            <>
              {isSignup
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setMessage("");
                  setShowPassword(false);
                }}
                className="ml-2 font-bold text-[#173D35] hover:underline"
              >
                {isSignup ? "Login" : "Sign Up"}
              </button>
            </>
          )}

        </div>
      </div>
    </main>
  );
}

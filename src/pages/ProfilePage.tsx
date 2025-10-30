// src/pages/ProfilePage.tsx
"use client";

import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <DashboardHeader />

      <main className="max-w-3xl mx-auto px-4 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 p-8 rounded-2xl bg-black/60 border border-[#00FF9C]/20 shadow-[0_10px_40px_rgba(0,255,156,0.06)] backdrop-blur-md"
        >
          <div className="flex flex-col items-center">
            <motion.img
              src={currentUser?.photoURL ?? "/favicon.png"}
              alt="profile"
              className="w-28 h-28 rounded-full mb-4 object-cover border-2 border-[#00FF9C]/40 shadow-[0_0_20px_rgba(0,255,156,0.12)]"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />

            <h2 className="text-2xl font-semibold text-white">
              {currentUser?.displayName ?? "Anonymous User"}
            </h2>
            <p className="text-sm text-slate-300 mt-1">{currentUser?.email ?? "-"}</p>

            {/* Profile info block */}
            <div className="mt-6 w-full">
              <h3 className="text-sm text-slate-300 mb-3">Profile Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#050505] p-4 rounded-md border border-[#222]">
                  <div className="text-xs text-slate-400">Username</div>
                  <div className="mt-1 font-medium">{currentUser?.displayName ?? "Not set"}</div>
                </div>

                <div className="bg-[#050505] p-4 rounded-md border border-[#222]">
                  <div className="text-xs text-slate-400">Email</div>
                  <div className="mt-1 font-medium">{currentUser?.email ?? "-"}</div>
                </div>
              </div>

              {/* actions */}
              <div className="mt-6 flex gap-3">
                <Button onClick={() => navigate("/dashboard")} className="bg-[#00FF9C] text-black">
                  Back to Dashboard
                </Button>
                <Button onClick={handleLogout} variant="destructive">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

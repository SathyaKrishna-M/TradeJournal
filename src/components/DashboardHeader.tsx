// src/components/DashboardHeader.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function DashboardHeader() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // close when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-md border-b border-[#00FF9C]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          {/* Left: logo + title */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <motion.div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#00FF9C] to-[#00C853] shadow-[0_0_12px_#00FF9C66]"
              animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <img src="/favicon.png" alt="TracknTrade" className="w-7 h-7" />
            </motion.div>

            <div className="leading-tight">
              <div className="text-lg font-semibold text-white">TracknTrade</div>
              <div className="text-xs text-slate-400 -mt-0.5">Track trades • Analyze performance</div>
            </div>
          </div>

          {/* Right: profile + dropdown */}
          <div className="flex items-center gap-3" ref={ref}>
            {/* optional small info / placeholder */}
            <div className="hidden sm:flex items-center text-sm text-slate-300 mr-4">
              {currentUser?.displayName ? (
                <span className="truncate max-w-[160px]">{currentUser.displayName}</span>
              ) : (
                <span className="truncate max-w-[160px]">{currentUser?.email ?? "Guest"}</span>
              )}
            </div>

            <button
              onClick={() => setOpen((s) => !s)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-[#00FF9C]/60 transition-all"
              aria-label="Open profile menu"
            >
              <img
                src={currentUser?.photoURL ?? "/favicon.png"}
                alt="profile"
                className="w-10 h-10 object-cover"
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-4 top-16 w-44 bg-[#0b0b0b] border border-[#00FF9C]/20 rounded-lg shadow-xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#00FF9C]/6"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/6"
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

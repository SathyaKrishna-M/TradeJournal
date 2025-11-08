"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardHeader() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

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
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b shadow-lg dark:bg-[#000000]/90 bg-white/90 dark:border-[rgba(255,255,255,0.08)] border-[rgba(0,0,0,0.1)]">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <div className="h-16 flex items-center justify-between">
          {/* Left: logo + title */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <motion.div
              className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-tr from-[#00FF99] to-[#00CC66] shadow-[0_0_12px_rgba(0,255,153,0.4)]"
              animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <img src="/favicon.png" alt="TracknTrade" className="w-7 h-7" />
            </motion.div>

            <div className="leading-tight">
              <div className="text-lg font-bold dark:text-white text-[#111111]">TracknTrade</div>
              <div className="text-xs dark:text-gray-400 text-[#666666] -mt-0.5">
                Dashboard
              </div>
            </div>
          </div>

          {/* Right: theme toggle + profile */}
          <div className="flex items-center gap-4" ref={ref}>
            <ThemeToggle />

            <div className="hidden sm:flex items-center text-sm text-muted-foreground mr-2 max-w-[220px] truncate">
              {currentUser?.displayName || currentUser?.email || "Guest"}
            </div>

            <button
              onClick={() => setOpen((s) => !s)}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-[#00FF99]/40 transition"
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
                  className="absolute right-4 top-16 w-44 bg-[#111111] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-lg overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#EAEAEA] hover:bg-[#1A1A1A] transition-colors"
                  >
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[#FF4D4D] hover:bg-[#FF4D4D]/10 transition-colors"
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

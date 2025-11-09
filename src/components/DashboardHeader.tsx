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
    <header className="fixed top-0 left-0 right-0 z-40 depth-nav backdrop-blur-sm">
      {/* Top Light Gradient Strip */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent dark:via-[rgba(255,255,255,0.05)] pointer-events-none" />
      
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative">
        <div className="h-16 flex items-center justify-between">
          {/* Left: logo + title */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/dashboard")}
          >
            <motion.div
              className="relative w-10 h-10 rounded-xl flex items-center justify-center depth-button-primary"
              animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              {/* Inner glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-transparent opacity-50" />
              <img src="/favicon.png" alt="TracknTrade" className="w-7 h-7 relative z-10" />
            </motion.div>

            <div className="leading-tight">
              <div className="text-lg font-bold dark:text-white text-[#111111] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                TracknTrade
              </div>
              <div className="text-xs dark:text-[#A0A0A0] text-[#666666] -mt-0.5">
                Dashboard
              </div>
            </div>
          </div>

          {/* Right: theme toggle + profile */}
          <div className="flex items-center gap-3" ref={ref}>
            <div className="depth-button rounded-lg p-2">
              <ThemeToggle />
            </div>

            <div className="hidden sm:flex items-center text-sm dark:text-[#A0A0A0] text-[#666666] mr-2 max-w-[220px] truncate px-3 py-1.5 rounded-lg depth-recessed">
              {currentUser?.displayName || currentUser?.email || "Guest"}
            </div>

            <button
              onClick={() => setOpen((s) => !s)}
              className="relative w-10 h-10 rounded-xl overflow-hidden depth-button depth-hover group"
              aria-label="Open profile menu"
            >
              {/* Profile image container with depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={currentUser?.photoURL ?? "/favicon.png"}
                alt="profile"
                className="w-full h-full object-cover relative z-10"
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute right-4 top-20 w-48 depth-layer-2 rounded-xl overflow-hidden z-50"
                  style={{
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {/* Top glow line */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
                  
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-4 py-3 text-sm dark:text-[#EAEAEA] text-[#111111] hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors depth-transition flex items-center gap-2"
                  >
                    <span>Profile</span>
                  </button>

                  <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent dark:via-[rgba(255,255,255,0.05)]" />

                  <button
                    onClick={() => {
                      setOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-[#FF4D4D] hover:bg-[rgba(255,77,77,0.1)] transition-colors depth-transition flex items-center gap-2"
                  >
                    <span>Logout</span>
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

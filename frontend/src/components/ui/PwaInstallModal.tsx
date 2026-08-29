'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, PlusSquare, X, Smartphone, Monitor, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';

const PWA_DISMISSED_KEY = 'sparai_pwa_install_dismissed_v1';
const FREE_PROMO_KEY = 'sparai_free_spar_modal_v1';

export function PwaInstallModal() {
  const [os, setOs] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        window.location.search.includes('source=pwa') ||
        localStorage.getItem('sparai_pwa_installed') === 'true';

      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      const handleAppInstalled = () => {
        localStorage.setItem('sparai_pwa_installed', 'true');
        setIsInstalled(true);
        setIsVisible(false);
      };

      window.addEventListener('appinstalled', handleAppInstalled);

      // Detect OS
      const ua = navigator.userAgent || '';
      if (/android/i.test(ua)) {
        setOs('android');
        setActiveGuideTab('android');
      } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
        setOs('ios');
        setActiveGuideTab('ios');
      } else {
        setOs('desktop');
        setActiveGuideTab('desktop');
      }

      // Handle Chrome/Android/Desktop PWA prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // Non-overlapping check: wait for free promo modal to finish or 2.5 seconds
      const timer = setInterval(() => {
        const hasDismissedPwa = localStorage.getItem(PWA_DISMISSED_KEY);
        if (hasDismissedPwa) return;

        // Check if free promo modal key is stored or modal is closed
        const promoElement = document.querySelector('[data-free-promo-active="true"]');
        if (!promoElement) {
          setIsVisible(true);
          clearInterval(timer);
        }
      }, 1500);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        clearInterval(timer);
      };
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(PWA_DISMISSED_KEY, 'true');
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || !isVisible) return null;

  return (
    <>
      {/* Sleek Non-Overlapping Bottom Floating Banner */}
      <AnimatePresence>
        {isVisible && !showGuideModal && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[80] bg-[#12160d]/95 border-2 border-primary/40 rounded-2xl p-4 shadow-[0_0_40px_rgba(226,255,59,0.25)] backdrop-blur-xl text-white"
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white"
              aria-label="Dismiss app shortcut banner"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 pr-6">
              <img
                src="/logo.jpg"
                alt="SPARAI Logo"
                className="w-11 h-11 rounded-xl object-cover border border-primary/50 shrink-0 shadow-[0_0_15px_rgba(226,255,59,0.4)]"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black uppercase text-primary tracking-widest">SPARAI WEB APP</span>
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                    {os === 'ios' ? 'iOS SHORTCUT' : os === 'android' ? 'ANDROID APP' : 'DESKTOP APP'}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-white/80 mt-1 leading-snug">
                  {os === 'ios'
                    ? 'Add SPARAI to your iPhone Home Screen for full screen AI sparring & training.'
                    : os === 'android'
                    ? 'Install SPARAI on your Android Home Screen for 1-click access & AI vision.'
                    : 'Download SPARAI Desktop App for fullscreen training & fast access.'}
                </p>
              </div>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              {os === 'android' || deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(226,255,59,0.4)] hover:brightness-110 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" /> 1-CLICK INSTALL
                </button>
              ) : (
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(226,255,59,0.4)] hover:brightness-110 active:scale-95 transition-all"
                >
                  {os === 'ios' ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {os === 'ios' ? 'ADD TO HOME SCREEN' : 'VIEW INSTALL GUIDE'}
                </button>
              )}

              <button
                onClick={() => setShowGuideModal(true)}
                className="py-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1"
              >
                GUIDE <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Device Installation Guide Modal */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGuideModal(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0e110a] border-2 border-primary/50 rounded-3xl p-6 shadow-[0_0_50px_rgba(226,255,59,0.3)] z-10 text-white max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowGuideModal(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/logo.jpg"
                  alt="SPARAI Logo"
                  className="w-8 h-8 rounded-lg object-cover border border-primary/50 shadow-[0_0_10px_rgba(226,255,59,0.4)]"
                />
                <h3 className="text-xl font-black italic uppercase text-white">HOW TO INSTALL SPARAI</h3>
              </div>
              <p className="text-xs font-semibold text-white/60 mb-5">
                Install SPARAI on your home screen to launch fullscreen like a native app without app store downloads.
              </p>

              {/* OS Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 border border-white/10 rounded-xl mb-6">
                {[
                  { id: 'android', label: 'Android', icon: Smartphone },
                  { id: 'ios', label: 'iPhone / iOS', icon: Share },
                  { id: 'desktop', label: 'PC / Mac', icon: Monitor },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeGuideTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveGuideTab(tab.id as any)}
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                        isActive
                          ? 'bg-primary text-black shadow-[0_0_12px_rgba(226,255,59,0.5)]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Android Instructions */}
              {activeGuideTab === 'android' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary">1-Click Install Button</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        Tap the <b>"1-CLICK INSTALL"</b> button on the app banner. Chrome or Edge will launch the native installation dialog automatically.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white">Manual Chrome Method</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        If using Android Chrome directly: tap the <b>3 dots menu</b> (top right) $\rightarrow$ select <b>"Install App"</b> or <b>"Add to Home screen"</b>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* iOS Instructions */}
              {activeGuideTab === 'ios' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary">Tap Safari Share Button</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        In Safari, tap the <b>Share button</b> <Share className="w-3.5 h-3.5 inline text-primary mx-0.5" /> (the square icon with upward arrow in Safari's bottom toolbar).
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white">Select "Add to Home Screen"</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        Scroll down the share menu list and tap <PlusSquare className="w-3.5 h-3.5 inline text-primary mx-0.5" /> <b>"Add to Home Screen"</b>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white">Tap "Add"</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        Tap <b>Add</b> in the top right corner. SPARAI will instantly appear as an app icon on your iPhone home screen!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Instructions */}
              {activeGuideTab === 'desktop' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-primary">Click Address Bar Install Icon</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        Look at the right side of your Chrome/Edge browser address bar and click the <b>Install icon</b> <Download className="w-3.5 h-3.5 inline text-primary mx-0.5" />.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-white">Confirm Installation</h4>
                      <p className="text-[11px] font-medium text-white/70 mt-0.5">
                        Click <b>Install</b> in the popup dialog. SPARAI will open in its standalone window and add desktop shortcuts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full mt-6 py-3 rounded-xl bg-primary text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(226,255,59,0.4)]"
              >
                GOT IT, CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

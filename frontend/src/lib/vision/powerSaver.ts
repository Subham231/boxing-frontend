// ---------------------------------------------------------------------------
// Power watcher — tells the overlay when to draw cheaper.
//
// Saver mode is ON when the battery is low and not charging, or the browser
// reports Save-Data, or it is forced (`?saver=1` on the URL, for testing).
// It only affects HOW THE OVERLAY IS DRAWN (no glow pass, lower canvas
// resolution, ~30fps repaint). It never touches pose inference or the
// analysis, so punch/reflex results are identical in and out of saver mode.
//
// The Battery Status API exists in Chromium browsers only; elsewhere this
// degrades to "never saver" (plus Save-Data if available) without throwing.
// ---------------------------------------------------------------------------

import { VISION_CONFIG } from './visionConfig';

interface BatteryLike extends EventTarget {
  level: number;
  charging: boolean;
}

interface NavigatorWithPower extends Navigator {
  getBattery?: () => Promise<BatteryLike>;
  connection?: { saveData?: boolean };
}

export class PowerWatcher {
  private battery: BatteryLike | null = null;
  private forced = false;
  private disposed = false;
  private _saver = false;
  private readonly onChange = () => this.evaluate();

  get saver(): boolean {
    return this._saver;
  }

  start(): void {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    this.forced = new URLSearchParams(window.location.search).get('saver') === '1';
    this.evaluate();
    const nav = navigator as NavigatorWithPower;
    if (typeof nav.getBattery !== 'function') return;
    nav
      .getBattery()
      .then((b) => {
        if (this.disposed) return;
        this.battery = b;
        b.addEventListener('levelchange', this.onChange);
        b.addEventListener('chargingchange', this.onChange);
        this.evaluate();
      })
      .catch(() => {
        /* Battery API blocked (permissions policy / privacy mode): stay non-saver. */
      });
  }

  dispose(): void {
    this.disposed = true;
    if (this.battery) {
      this.battery.removeEventListener('levelchange', this.onChange);
      this.battery.removeEventListener('chargingchange', this.onChange);
      this.battery = null;
    }
  }

  private evaluate(): void {
    const nav = (typeof navigator !== 'undefined' ? navigator : null) as NavigatorWithPower | null;
    const lowBattery =
      !!this.battery && !this.battery.charging && this.battery.level <= VISION_CONFIG.display.saverBatteryLevel;
    const saveData = nav?.connection?.saveData === true;
    this._saver = this.forced || lowBattery || saveData;
  }
}

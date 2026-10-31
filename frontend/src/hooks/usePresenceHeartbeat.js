import { useEffect } from "react";
import { sendPresenceHeartbeat } from "../lib/api.js";

const HEARTBEAT_INTERVAL_MS = 45_000;

/**
 * Periodically refreshes the authenticated user's Redis presence TTL key
 * while the browser tab is active.
 */
export default function usePresenceHeartbeat(enabled) {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      sendPresenceHeartbeat().catch(() => {});
    };

    ping();
    const timer = setInterval(ping, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled]);
}

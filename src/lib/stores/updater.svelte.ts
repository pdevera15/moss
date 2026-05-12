import { check } from "@tauri-apps/plugin-updater";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import pkg from "../../../package.json";

export type UpdaterState =
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "ready"
  | "error";

const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

class UpdaterStore {
  currentVersion = $state("—");
  updateState = $state<UpdaterState>("checking");
  latestVersion = $state("");
  releaseNotes = $state("");
  releaseDate = $state("");
  downloadPct = $state(0);
  downloadedMB = $state(0);
  totalMB = $state(0);
  lastChecked = $state("—");
  errorMsg = $state("");
  autoUpdate = $state(true);

  #handle: Awaited<ReturnType<typeof check>> | null = null;

  async init() {
    if (!isTauri) {
      this.currentVersion = pkg.version;
      this.updateState = "up-to-date";
      this.lastChecked = "just now";
      return;
    }
    try {
      this.currentVersion = await getVersion();
    } catch {
      /* ignore */
    }
    await this.checkForUpdates();
  }

  async checkForUpdates() {
    this.updateState = "checking";
    this.lastChecked = "…";
    this.errorMsg = "";
    try {
      const update = await check();
      this.lastChecked = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      if (update) {
        this.#handle = update;
        this.latestVersion = update.version ?? "";
        this.releaseNotes = update.body ?? "";
        this.releaseDate = update.date
          ? new Date(update.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "";
        this.updateState = "available";
      } else {
        this.updateState = "up-to-date";
      }
    } catch (e) {
      this.updateState = "error";
      this.errorMsg = e instanceof Error ? e.message : String(e);
      this.lastChecked = "unavailable";
    }
  }

  async startDownload() {
    if (!this.#handle) return;
    this.updateState = "downloading";
    this.downloadPct = 0;
    this.downloadedMB = 0;
    this.totalMB = 0;
    try {
      await this.#handle.downloadAndInstall((event) => {
        if (event.event === "Started") {
          this.totalMB = (event.data.contentLength ?? 0) / 1_048_576;
        } else if (event.event === "Progress") {
          this.downloadedMB += event.data.chunkLength / 1_048_576;
          this.downloadPct =
            this.totalMB > 0
              ? Math.min(
                  99,
                  Math.round((this.downloadedMB / this.totalMB) * 100),
                )
              : 0;
        } else if (event.event === "Finished") {
          this.downloadPct = 100;
          this.updateState = "ready";
        }
      });
    } catch (e) {
      this.updateState = "error";
      this.errorMsg = e instanceof Error ? e.message : String(e);
    }
  }

  async restartNow() {
    try {
      await invoke("plugin:process|relaunch");
    } catch {
      this.errorMsg = "Please close and reopen Moss to apply the update.";
      this.updateState = "ready";
    }
  }
}

export const updater = new UpdaterStore();

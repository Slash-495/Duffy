import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("Duffy-theme") || "coffee",
  setTheme: (theme) => {
    localStorage.setItem("Duffy-theme", theme);
    set({ theme });
  },
}));
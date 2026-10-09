import type { DemoAccounts, Me } from "@/types/api";
import { api } from "./client";

export const getMe = () => api<Me>("/auth/me");

export const getDemoAccounts = () => api<DemoAccounts>("/auth/demo-accounts");

export const login = (userId: number) =>
  api<Me>("/auth/login", { method: "POST", body: { user_id: userId } });

export const logout = () => api<void>("/auth/logout", { method: "POST" });

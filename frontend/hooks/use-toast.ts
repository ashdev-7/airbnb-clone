"use client";

import { useContext } from "react";
import { ToastContext, type ToastApi } from "@/components/ui/toast";

export function useToast(): ToastApi {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error("useToast needs <ToastProvider>");
  return toast;
}

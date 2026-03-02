"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { isInAppBrowser } from "@/lib/inAppBrowser";

const IN_APP_CLASS = "in-app-browser";

type InAppBrowserContextValue = {
  /** True when opened in WeChat or Facebook in-app browser. Skip WebGL/GLB and use vh fallbacks. */
  isInAppBrowser: boolean;
  /** When true, hero should not mount 3D GLB canvases (avoids WebGL failures in WebViews). */
  skipWebGL: boolean;
};

const defaultValue: InAppBrowserContextValue = {
  isInAppBrowser: false,
  skipWebGL: false,
};

const InAppBrowserContext = createContext<InAppBrowserContextValue>(defaultValue);

export function useInAppBrowser(): InAppBrowserContextValue {
  return useContext(InAppBrowserContext);
}

export function InAppBrowserProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<InAppBrowserContextValue>(defaultValue);

  useEffect(() => {
    const inApp = isInAppBrowser();
    setValue({ isInAppBrowser: inApp, skipWebGL: inApp });
    const html = document.documentElement;
    if (inApp) {
      html.classList.add(IN_APP_CLASS);
    } else {
      html.classList.remove(IN_APP_CLASS);
    }
    return () => html.classList.remove(IN_APP_CLASS);
  }, []);

  return (
    <InAppBrowserContext.Provider value={value}>
      {children}
    </InAppBrowserContext.Provider>
  );
}

import { useEffect, useRef } from "react";
import { AppProvider, useApp } from "@/contexts/AppContext";

const IframeBridge = () => {
  const { appState, patch } = useApp();
  const ref = useRef<HTMLIFrameElement>(null);

  // Push current app state into the iframe whenever it changes
  useEffect(() => {
    const send = () => {
      ref.current?.contentWindow?.postMessage(
        { type: "TOOLA_APP_STATE", payload: appState },
        "*"
      );
    };
    send();

    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "TOOLA_REQUEST_STATE") send();
      if (e.data?.type === "TOOLA_STATE_PATCH" && e.data.payload) {
        patch(e.data.payload);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [appState, patch]);

  return (
    <iframe
      ref={ref}
      src="/toola.html"
      title="ToolA"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
};

const Index = () => (
  <AppProvider>
    <IframeBridge />
  </AppProvider>
);

export default Index;

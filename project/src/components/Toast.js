import { createContext, useCallback, useContext, useRef, useState } from "react";
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

const ToastContext = createContext(null);

const ICONS = {
  success: <FiCheckCircle size={17} />,
  error:   <FiAlertCircle size={17} />,
  warning: <FiAlertTriangle size={17} />,
  info:    <FiInfo size={17} />,
};

const COLORS = {
  success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d", icon: "#16a34a" },
  error:   { bg: "#fef2f2", border: "#fecaca", text: "#b91c1c", icon: "#dc2626" },
  warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "#d97706" },
  info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", icon: "#2563eb" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const showToast = useCallback((message, type = "info", duration = 4000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{
        position: "fixed", top: 20, right: 20,
        zIndex: 9999, display: "flex", flexDirection: "column", gap: 10,
        maxWidth: 380, pointerEvents: "none",
      }}>
        {toasts.map(({ id, message, type }) => {
          const c = COLORS[type] || COLORS.info;
          return (
            <div key={id} style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 12, padding: "13px 14px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              animation: "slideIn 0.25s ease",
              pointerEvents: "all",
            }}>
              <span style={{ color: c.icon, flexShrink: 0, marginTop: 1 }}>
                {ICONS[type]}
              </span>
              <span style={{ fontSize: 13.5, color: c.text, fontWeight: 500, flex: 1, lineHeight: 1.45 }}>
                {message}
              </span>
              <button
                onClick={() => dismiss(id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: c.icon, opacity: 0.6, padding: 0, flexShrink: 0 }}
              >
                <FiX size={15} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

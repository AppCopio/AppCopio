import React from "react";
import "./SidePanel.css";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

const SidePanel: React.FC<SidePanelProps> = ({ open, onClose, children, title = "Información del Centro" }) => {
  return (
    <>
      {/* overlay detrás */}
      {open && <div className="sidepanel-overlay" onClick={onClose}></div>}

      {/* panel encima del overlay */}
      <div
        className={`sidepanel ${open ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()} // 👈 evita cierre por clic interno
      >
        <div className="sidepanel-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidepanel-body">{children}</div>
      </div>
    </>
  );
};

export default SidePanel;

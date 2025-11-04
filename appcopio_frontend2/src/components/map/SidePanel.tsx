import React from "react";
import "./SidePanel.css";

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const SidePanel: React.FC<SidePanelProps> = ({ open, onClose, children }) => {
  return (
    <div className={`sidepanel ${open ? "open" : ""}`}>
      <div className="sidepanel-content">
        <div className="sidepanel-header">
          <h2>Recursos Urgentes</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sidepanel-body">{children}</div>
      </div>

      {open && <div className="sidepanel-overlay" onClick={onClose}></div>}
    </div>
  );
};

export default SidePanel;

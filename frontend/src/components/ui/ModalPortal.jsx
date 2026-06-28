import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children }) {
  const [container] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  }, [container]);

  return createPortal(children, container);
}
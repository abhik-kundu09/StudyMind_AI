import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";

const ChatInput = ({ onSend, isStreaming, disabled }) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  const handleSend = useCallback(() => {
    const msg = value.trim();
    if (!msg || isStreaming || disabled) return;
    onSend(msg);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, disabled, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e) => {
    setValue(e.target.value);
    // auto-resize
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const canSend = value.trim().length > 0 && !isStreaming && !disabled;

  return (
    <div
      className="relative flex items-end gap-3 rounded-2xl p-3 transition-all duration-200"
      style={{
        background: "rgba(15, 18, 37, 0.8)",
        border: `1px solid ${canSend ? "rgba(212,168,86,0.35)" : "rgba(212,168,86,0.12)"}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? "Select or create a chat session..."
            : "Ask anything about your document… (Shift+Enter for new line)"
        }
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-40"
        style={{
          color: "#E2E8F8",
          fontFamily: "var(--font-display)",
          minHeight: "24px",
          maxHeight: "160px",
        }}
      />

      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200"
        style={{
          background: canSend
            ? "linear-gradient(135deg, #D4A856, #E8B894)"
            : "rgba(212,168,86,0.08)",
          color: canSend ? "#0A0908" : "rgba(212,168,86,0.3)",
          cursor: canSend ? "pointer" : "not-allowed",
        }}
      >
        {isStreaming ? (
          // Stop / loading indicator
          <div
            className="h-3 w-3 rounded-sm"
            style={{ background: "rgba(212,168,86,0.5)" }}
          />
        ) : (
          <Send size={14} strokeWidth={2.5} />
        )}
      </button>
    </div>
  );
};

export default ChatInput;
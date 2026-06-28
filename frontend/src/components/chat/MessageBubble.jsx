import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import SourceCard from "./SourceCard";
import StreamingCursor from "./StreamingCursor";

const UserBubble = ({ content }) => (
  <div className="flex justify-end msg-enter">
    <div
      className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed"
      style={{
        background: "rgba(232, 184, 148, 0.12)",
        border: "1px solid rgba(232, 184, 148, 0.25)",
        color: "#E2E8F8",
      }}
    >
      {content}
    </div>
  </div>
);

const AssistantBubble = ({ content, sources, isStreaming }) => (
  <div className="flex gap-3 msg-enter">
    {/* Avatar */}
    <div
      className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        background: "linear-gradient(135deg, #D4A856, #E8B894)",
        color: "#0A0908",
      }}
    >
      S
    </div>

    <div className="flex-1 min-w-0">
      {/* Message content with markdown */}
      <div
        className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed"
        style={{ color: "#CBD5E8" }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ inline, className, children, ...props }) {
              return inline ? (
                <code
                  className={className}
                  style={{
                    background: "rgba(212,168,86,0.08)",
                    color: "#D4A856",
                    padding: "1px 5px",
                    borderRadius: "4px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.85em",
                  }}
                  {...props}
                >
                  {children}
                </code>
              ) : (
                <pre
                  style={{
                    background: "rgba(10,12,30,0.8)",
                    border: "1px solid rgba(212,168,86,0.12)",
                    borderRadius: "10px",
                    padding: "12px 16px",
                    overflow: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.82em",
                  }}
                >
                  <code {...props}>{children}</code>
                </pre>
              );
            },
            p({ children }) {
              return (
                <p style={{ margin: "0 0 8px", lineHeight: "1.7" }}>
                  {children}
                </p>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
        {isStreaming && <StreamingCursor />}
      </div>

      {/* Source citations */}
      {!isStreaming && <SourceCard sources={sources} />}
    </div>
  </div>
);

const MessageBubble = ({ message, isStreamingMsg = false, streamingContent = "", streamingSources = [] }) => {
  if (message.role === "user") {
    return <UserBubble content={message.content} />;
  }

  const content = isStreamingMsg ? streamingContent : message.content;
  const sources = isStreamingMsg ? streamingSources : message.sources;

  return (
    <AssistantBubble
      content={content}
      sources={sources}
      isStreaming={isStreamingMsg}
    />
  );
};

export default MessageBubble;
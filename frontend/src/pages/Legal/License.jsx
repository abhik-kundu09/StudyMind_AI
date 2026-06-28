// pages/Legal/License.jsx
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GOLD   = "#D4A856";
const TEXT   = "#F0E6D2";
const MUTED  = "rgba(180,195,230,0.5)";
const PANEL  = "rgba(20,17,12,0.7)";
const BORDER = "rgba(212,168,86,0.15)";

const Section = ({ title, children }) => (
  <div className="flex flex-col gap-2">
    <h2 className="text-sm font-semibold" style={{ color: GOLD }}>
      {title}
    </h2>
    <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
      {children}
    </p>
  </div>
);

const LicensePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "#0A0908" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4"
        style={{
          background: "rgba(10,9,8,0.92)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm transition-all cursor-pointer hover:opacity-80"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="h-4 w-px" style={{ background: BORDER }} />
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: GOLD }} />
          <span className="text-sm font-medium" style={{ color: TEXT }}>
            License
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div
          className="rounded-3xl p-8 flex flex-col gap-6"
          style={{ background: PANEL, border: `1px solid ${BORDER}` }}
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold" style={{ color: TEXT }}>
              MIT License
            </h1>
            <p className="text-xs" style={{ color: MUTED }}>
              Copyright © 2026 Abhik Kundu
            </p>
          </div>

          <div className="h-px w-full" style={{ background: BORDER }} />

          {/* MIT licence text — no external quote, original presentation */}
          <div
            className="rounded-2xl p-5 text-sm leading-relaxed font-mono"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid rgba(212,168,86,0.08)`,
              color: MUTED,
            }}
          >
            <p>Copyright (c) 2026 Abhik Kundu</p>
            <br />
            <p>
              Permission is hereby granted, free of charge, to any person obtaining
              a copy of this software and associated documentation files (the
              &quot;Software&quot;), to deal in the Software without restriction,
              including without limitation the rights to use, copy, modify, merge,
              publish, distribute, sublicense, and/or sell copies of the Software,
              and to permit persons to whom the Software is furnished to do so,
              subject to the following conditions:
            </p>
            <br />
            <p>
              The above copyright notice and this permission notice shall be included
              in all copies or substantial portions of the Software.
            </p>
            <br />
            <p>
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY
              KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
              NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
              LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
              OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
              WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>

          <Section title="Third-Party Libraries">
            StudyMind AI is built on open-source software including React, FastAPI,
            LangChain, FAISS, and others. Each library retains its original licence.
            Refer to the project repository for a full dependency list.
          </Section>

          <Section title="AI Model Usage">
            This project uses Groq-hosted language models and HuggingFace embedding
            models. Their usage is subject to their respective provider terms of service
            and acceptable use policies.
          </Section>

          <Section title="Data & Privacy">
            User-uploaded documents are stored securely and processed solely for
            generating personalised study content. No user data is sold or shared with
            third parties. Data may be deleted upon account deletion.
          </Section>
        </div>
      </div>
    </div>
  );
};

export default LicensePage;
// components/AppFooter.jsx
import { ExternalLink, Mail, FileText, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const MUTED = "rgba(180,195,230,0.3)";

const FooterLink = ({ href, label, external }) => {
  const cls = "flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer hover:opacity-80";
  const style = { color: MUTED };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>
        <ExternalLink size={11} />
        {label}
      </a>
    );
  }
  return (
    <Link to={href} className={cls} style={style}>
      {label}
    </Link>
  );
};

const AppFooter = () => (
  <div
    className="w-full px-6 py-4 mt-auto"
    style={{ borderTop: "1px solid rgba(212,168,86,0.06)" }}
  >
    <div className="flex flex-wrap items-center justify-between gap-3 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <FooterLink href="/legal/terms"   label="Terms & Conditions" icon={FileText} />
        <FooterLink href="/legal/license" label="License" />
      </div>
      <div className="flex items-center gap-4">
        <FooterLink href="https://github.com/abhik-kundu09"            label="GitHub"   external />
        <FooterLink href="https://www.linkedin.com/in/abhik--kundu"    label="LinkedIn" external />
        <FooterLink href="mailto:itsabhik003@gmail.com"                label="Contact"  external />
      </div>
    </div>
  </div>
);

export default AppFooter;
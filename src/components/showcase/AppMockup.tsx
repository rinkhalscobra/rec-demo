import { motion } from "framer-motion";
import {
  Archive,
  FileText,
  Folder,
  MoreHorizontal,
  Paperclip,
  Reply,
  Forward,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wallet,
  Eye,
  History,
  Briefcase,
} from "lucide-react";

const navItems = [
  { icon: Wallet, label: "Located Funds", count: 5, active: false },
  { icon: Eye, label: "Watchlist", count: 3 },
  { icon: Briefcase, label: "Cases", count: 2, active: true },
  { icon: History, label: "Transactions" },
  { icon: FileText, label: "Documents" },
  { icon: Archive, label: "Archive" },
];

const cases = [
  { from: "Exchange Response Desk", subject: "Exchange scam · BTC", preview: "Trace complete on 3 wallets. Freeze requested via VASP…", time: "9:41 AM", unread: true, active: true, amount: "€48,200" },
  { from: "Case BR-1842", subject: "Phishing wallet · ETH", preview: "Attacker moved funds through Tornado mixer. New leads…", time: "8:12 AM", unread: true, amount: "€12,480" },
  { from: "Nova Token Case", subject: "Rug pull — Nova token", preview: "Legal filing prepared for jurisdiction transfer.", time: "Yesterday", amount: "€8,900" },
  { from: "Case BR-2207", subject: "Romance scam · USDT", preview: "Victim statement collected. Awaiting chain trace review.", time: "Yesterday", amount: "€22,100" },
  { from: "Forensics Unit", subject: "Wallet cluster report", preview: "6 addresses tagged as high-risk mixer output.", time: "Mon", amount: "€6,300" },
  { from: "Case BR-0931", subject: "Impersonation · SOL", preview: "Exchange KYC pull confirms recipient identity.", time: "Mon", amount: "€3,750" },
];

const labels = [
  { name: "BTC", color: "#087780" },
  { name: "ETH", color: "#345aa0" },
  { name: "USDT", color: "#7760a0" },
  { name: "SOL", color: "#ad7133" },
];

const AppMockup = () => (
  <motion.div
    id="located-funds"
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    className="showcase-anchor relative z-10 w-full px-4 py-12 sm:px-6 md:py-16 lg:px-8"
  >
    <div className="relative rounded-2xl overflow-hidden border border-border bg-card backdrop-blur-2xl shadow-[0_40px_120px_-20px_rgba(255,255,255,0.12)]">
      {/* Title bar */}
      <div className="h-9 border-b border-border flex items-center px-4 relative bg-card">
        <div className="flex gap-2">
          <span className="w-3 h-3 rounded-full bg-secondary" />
          <span className="w-3 h-3 rounded-full bg-secondary" />
          <span className="w-3 h-3 rounded-full bg-secondary" />
        </div>
        <span className="absolute left-1/2 -translate-x-1/2 text-xs text-muted-foreground">Financial Recovery — Case Center</span>
      </div>

      <div className="grid grid-cols-12 h-[520px]">
        {/* Sidebar */}
        <div className="col-span-3 border-r border-border bg-card p-4 flex flex-col gap-4">
          <button className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            View my case
          </button>
          <div className="flex flex-col gap-0.5 text-sm">
            {navItems.map(({ icon: Icon, label, count, active }) => (
              <div
                key={label}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent"}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1">{label}</span>
                {count && <span className="text-xs text-muted-foreground">{count}</span>}
              </div>
            ))}
          </div>
          <div className="mt-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 px-2.5">Labels</div>
            <div className="flex flex-col gap-1">
              {labels.map((l) => (
                <div key={l.name} className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Case list */}
        <div className="col-span-4 border-r border-border flex flex-col">
          <div className="h-10 px-3 border-b border-border flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input readOnly value="Search cases" className="bg-transparent text-xs text-muted-foreground outline-none w-full" />
          </div>
          <div className="flex-1 overflow-hidden">
            {cases.map((c, i) => (
              <div
                key={i}
                className={`px-3 py-2.5 border-b border-border cursor-pointer ${c.active ? "bg-secondary" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {c.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  <span className="text-xs font-semibold text-foreground truncate flex-1">{c.from}</span>
                  <span className="text-xs text-muted-foreground">{c.time}</span>
                </div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs text-muted-foreground truncate">{c.subject}</span>
                  <span className="text-xs font-semibold text-foreground">{c.amount}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.preview}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Reader */}
        <div className="col-span-5 flex flex-col">
          <div className="h-10 px-3 border-b border-border flex items-center gap-1">
            {[Reply, Forward, Archive, Trash2].map((Icon, i) => (
              <button key={i} className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
            <div className="ml-auto">
              <button className="w-7 h-7 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-5">
            <h3 className="text-base font-semibold text-foreground mb-3">Exchange scam · BTC recovery</h3>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                R
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-foreground">Recovery Team</div>
                <div className="text-xs text-muted-foreground">to you · 9:41 AM</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border font-medium">
                Phase 3 · Legal
              </span>
            </div>

            <div className="liquid-glass rounded-xl p-3 mb-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Summary by Financial Recovery AI</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                On-chain trace complete across 3 clusters. Funds routed via a licensed VASP — freeze request filed. Estimated recovery: 68%. No further action required from you.
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>Hello,</p>
              <p>
                We finalized the chain-of-custody report on the 1.42 BTC transferred out of your exchange account on May 3.
                All three destination clusters have been mapped and forwarded to our legal partners in the UK and Luxembourg.
              </p>
              <p>
                Two of the three receiving wallets were cashed out through a compliant exchange — our freeze request is
                filed and expected to be processed within 72 hours.
              </p>
              <p className="text-muted-foreground">— The Financial Recovery Team</p>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-secondary text-xs text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              case-file-24601.pdf
            </div>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

export default AppMockup;

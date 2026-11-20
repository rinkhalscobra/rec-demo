import { motion } from "framer-motion";
import { SectionEyebrow } from "./primitives";

const chips = ["On-chain forensics", "Exchange partners", "Wallet risk scoring", "Instant freeze requests"];

const buckets = [
  {
    name: "Critical",
    count: 4,
    color: "#087780",
    items: ["0x7a3f… — mixer output", "bc1q9k… — sanctioned entity"],
  },
  {
    name: "Suspicious",
    count: 7,
    color: "#345aa0",
    items: ["0x21ab… — chain hopping", "0x4f8c… — new counterparty"],
  },
  {
    name: "Monitoring",
    count: 18,
    color: "#7760a0",
    items: ["bc1qxy… — dormant", "0x93ee… — low volume"],
  },
  {
    name: "Cleared",
    count: 13,
    color: "#ad7133",
    items: ["Verified VASP · Custodial wallets · KYC-linked"],
  },
];

const FraudPanel = () => (
  <section id="cases" className="showcase-anchor relative z-10 w-full px-4 py-16 sm:px-6 md:py-20 lg:px-8">
    <div className="grid items-start gap-8 md:grid-cols-2 lg:gap-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
      >
        <SectionEyebrow label="Detection" tag="AI-native" />
        <h2 className="showcase-section-title mt-5 text-foreground">
          Spot the scam
          <br />
          before it drains you.
        </h2>
        <p className="mt-6 text-muted-foreground text-base leading-[1.6] max-w-md">
          Financial Recovery watches every wallet, cross-references it against known scam clusters, and flags risk in seconds.
          Chain-of-custody evidence is built automatically — ready for exchanges, banks, and law enforcement.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span
              key={c}
              className="text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border bg-secondary"
            >
              {c}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="liquid-glass rounded-2xl p-5"
      >
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Today · 42 wallets analyzed</div>
        <div className="grid grid-cols-2 gap-3">
          {buckets.map((b) => (
            <div key={b.name} className="liquid-glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                  <span className="text-xs font-semibold text-foreground">{b.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">({b.count})</span>
              </div>
              <div className="space-y-1">
                {b.items.map((it) => (
                  <div key={it} className="text-xs text-muted-foreground truncate">
                    {it}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default FraudPanel;

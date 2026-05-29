import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import styles from "./page.module.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "900"],
  variable: "--font-fraunces",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  title: "The Configurator Pattern",
  description: "healthbenefits.shop strategy one-pager",
};

export default function OnePagerPage() {
  return (
    <div className={`${styles.page} ${fraunces.variable} ${ibmPlexSans.variable}`}>
      <div className={styles.sheet}>
        <div className={`${styles.eyebrow} ${styles.r} ${styles.d1}`}>
          healthbenefits.shop · Strategy one-pager
        </div>
        <h1 className={`${styles.h1} ${styles.r} ${styles.d1}`}>
          The configurator pattern, applied to the <em>OTC benefit.</em>
        </h1>
        <p className={`${styles.lede} ${styles.r} ${styles.d2}`}>
          Medicare Advantage members leave <b>billions in over-the-counter dollars unspent every year</b>{" "}
          - not because they do not want the products, but because the benefit is unnavigable. We
          did not invent a fix. <b>We ported a proven supply-chain pattern to a market no one has solved.</b>
        </p>

        <div className={`${styles.rule} ${styles.r} ${styles.d2}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d3}`}>
          <span className={styles.n}>1</span> Proven pattern, not a new idea
        </div>
        <div className={styles.two}>
          <div className={`${styles.card} ${styles.r} ${styles.d3}`}>
            <div className={styles.tag}>Configuration, not curation</div>
            <h3>The Dell / CPQ builder</h3>
            <p>
              You do not pick a motherboard and a power supply. You state how you will use the
              machine, and the system assembles a <b>valid, compatible build</b> - guaranteeing the
              parts work together. Configure-Price-Quote engines have run this playbook for decades.
            </p>
            <div className={styles.pull}>The system carries the expertise. The buyer only brings their need.</div>
          </div>
          <div className={`${styles.card} ${styles.r} ${styles.d4}`}>
            <div className={styles.tag}>One product, many SKUs</div>
            <h3>UNSPSC &amp; GTIN standards</h3>
            <p>
              Global supply chains collapse duplicate products from every supplier into one{" "}
              <b>canonical entry</b>, then map each vendor&apos;s code beneath it - a 20-year-old GS1
              standard.
            </p>
            <div className={styles.pull}>
              Documented case: <b>15 variants of one valve -&gt; 3 canonical entries</b>, cutting carrying
              cost on contact.
            </div>
          </div>
        </div>

        <div className={`${styles.rule} ${styles.r} ${styles.d4}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d4}`}>
          <span className={styles.n}>2</span> Why the OTC benefit breaks today
        </div>
        <div className={styles.three}>
          <div className={`${styles.prob} ${styles.r} ${styles.d5}`}>
            <div className={styles.h}>Buried benefit</div>
            <p>
              The allowance is hidden in an Evidence-of-Coverage PDF. Members often do not know it
              exists or that funds reset quarterly.
            </p>
          </div>
          <div className={`${styles.prob} ${styles.r} ${styles.d5}`}>
            <div className={styles.h}>SKU chaos</div>
            <p>
              The same product carries different codes across Walmart, CVS, Medline, and the
              NationsOTC / OTCHS catalogs. No shared language.
            </p>
          </div>
          <div className={`${styles.prob} ${styles.r} ${styles.d6}`}>
            <div className={styles.h}>Navigation burden</div>
            <p>
              Roughly 1 in 4 Americans over 65 do not use the internet - and frankly, none of us know
              exactly what to buy. The cognitive load kills utilization.
            </p>
          </div>
        </div>

        <div className={`${styles.rule} ${styles.r} ${styles.d6}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d6}`}>
          <span className={styles.n}>3</span> How healthbenefits.shop applies it
        </div>
        <div className={`${styles.map} ${styles.r} ${styles.d7}`}>
          <div className={styles.row}>
            <div className={styles.from}>
              <div className={styles.k}>Precedent</div>
              <div className={styles.v}>Canonical hierarchy (UNSPSC / GTIN)</div>
            </div>
            <div className={styles.bridge} aria-hidden>
              ↓
            </div>
            <div className={styles.to}>
              <div className={styles.k}>Our application</div>
              <div className={styles.v}>
                One canonical item, mapped to every retailer SKU <i>and</i> CMS-approved catalog code
              </div>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.from}>
              <div className={styles.k}>Precedent</div>
              <div className={styles.v}>Constraint solver (Dell CPQ)</div>
            </div>
            <div className={styles.bridge} aria-hidden>
              ↓
            </div>
            <div className={styles.to}>
              <div className={styles.k}>Our application</div>
              <div className={styles.v}>
                Member states needs -&gt; solver returns a budget-fit, plan-eligible, compatible cart
              </div>
            </div>
          </div>
          <div className={styles.row}>
            <div className={styles.from}>
              <div className={styles.k}>Precedent</div>
              <div className={styles.v}>Parent-child SKU relationship</div>
            </div>
            <div className={styles.bridge} aria-hidden>
              ↓
            </div>
            <div className={styles.to}>
              <div className={styles.k}>Our application</div>
              <div className={styles.v}>
                The meter is a &quot;system&quot;; test strips &amp; control solution lock to it as children
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.rule} ${styles.r} ${styles.d7}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d7}`}>
          <span className={styles.n}>4</span> The engine: substitutability tiers
        </div>
        <div className={styles.tiers}>
          <div className={`${styles.tier} ${styles.a} ${styles.r} ${styles.d7}`}>
            <span className={styles.pct}>~60-70%</span>
            <div className={styles.lvl}>Tier 1</div>
            <div className={styles.nm}>Commodity</div>
            <p>
              Any brand satisfies the need - socks, foot cream, glucose tabs, prep pads. The solver
              picks freely on price.
            </p>
          </div>
          <div className={`${styles.tier} ${styles.b} ${styles.r} ${styles.d8}`}>
            <span className={styles.pct}>spec-bound</span>
            <div className={styles.lvl}>Tier 2</div>
            <div className={styles.nm}>Attribute-matched</div>
            <p>
              Interchangeable if one spec lines up - lancet fit, compression mmHg, needle gauge.
              Filter, then pick.
            </p>
          </div>
          <div className={`${styles.tier} ${styles.c} ${styles.r} ${styles.d8}`}>
            <span className={styles.pct}>locked</span>
            <div className={styles.lvl}>Tier 3</div>
            <div className={styles.nm}>System-locked</div>
            <p>Must match a parent device. Strips &amp; control solution travel with the meter as one unit.</p>
          </div>
        </div>

        <div className={`${styles.rule} ${styles.r} ${styles.d8}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d8}`}>
          <span className={styles.n}>5</span> The configurator as a constraint solver
        </div>
        <div className={`${styles.flow} ${styles.r} ${styles.d8}`}>
          <div className={styles.step}>
            <div className={styles.lab}>Inputs</div>
            <ul>
              <li>Member&apos;s selected needs</li>
              <li>Quarterly allowance</li>
              <li>Their plan&apos;s eligible catalog</li>
            </ul>
          </div>
          <div className={styles.step}>
            <div className={styles.lab}>Constraints</div>
            <ul>
              <li>Eligibility (CMS-approved)</li>
              <li>Compatibility (meter &lt;-&gt; strips)</li>
              <li>Budget (allowance cap)</li>
            </ul>
          </div>
          <div className={styles.step}>
            <div className={styles.lab}>Output</div>
            <ul>
              <li>A complete, valid cart</li>
              <li>Remaining balance</li>
              <li>Headroom to spend down</li>
            </ul>
          </div>
        </div>
        <div className={`${styles.verdict} ${styles.r} ${styles.d8}`}>
          <b>Budget rule:</b> price each item as a range. Build against the <span className={styles.mono}>ceiling</span>{" "}
          for a <b>guaranteed-fit</b> promise on any catalog; track the{" "}
          <span className={styles.mono}>floor</span> to chase <b>utilization</b> - because unused dollars do
          not roll over.
        </div>

        <div className={`${styles.rule} ${styles.r} ${styles.d8}`} />

        <div className={`${styles.secLabel} ${styles.r} ${styles.d8}`}>
          <span className={styles.n}>6</span> Why it compounds
        </div>
        <div className={`${styles.fly} ${styles.r} ${styles.d8}`}>
          <span className={styles.node}>Utilization up</span>
          <span className={styles.chev} aria-hidden>
            &gt;
          </span>
          <span className={styles.node}>Outcomes up</span>
          <span className={styles.chev} aria-hidden>
            &gt;
          </span>
          <span className={`${styles.node} ${styles.alt}`}>Star ratings up</span>
          <span className={styles.chev} aria-hidden>
            &gt;
          </span>
          <span className={styles.node}>Plan revenue up</span>
          <span className={styles.chev} aria-hidden>
            &gt;
          </span>
          <span className={`${styles.node} ${styles.alt}`}>Reinvest in members</span>
        </div>
        <div className={styles.stats}>
          <div className={`${styles.stat} ${styles.r} ${styles.d8}`}>
            <div className={styles.big}>70%+</div>
            <div className={styles.cap}>of Medicare Advantage plans now offer an OTC benefit</div>
          </div>
          <div className={`${styles.stat} ${styles.r} ${styles.d8}`}>
            <div className={styles.big}>25M+</div>
            <div className={styles.cap}>members with access - a top-3 most-used supplemental benefit</div>
          </div>
          <div className={`${styles.stat} ${styles.r} ${styles.d8}`}>
            <div className={styles.big}>$0</div>
            <div className={styles.cap}>
              rolls over - every unspent quarter is a missed outcome and a missed star credit
            </div>
          </div>
        </div>

        <footer className={`${styles.footer} ${styles.r} ${styles.d8}`}>
          <span className={styles.brand}>healthbenefits.shop</span>
          <span>Canonical hierarchy + configurator · Strategy brief</span>
        </footer>
      </div>
    </div>
  );
}

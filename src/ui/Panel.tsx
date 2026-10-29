import { AnimatePresence, motion } from "framer-motion";
import { COUCH_STYLES, CATEGORIES, type CategoryId, type CouchStyle } from "../data/furniture";
import type { Configurator } from "../state/useConfigurator";
import { CrossfadeText } from "./CrossfadeText";
import { Logo } from "./Logo";
import { PriceRoll } from "./PriceRoll";
import { SegmentedGroup } from "./RadioGroup";
import { StepIndicator } from "./StepIndicator";
import { Swatches } from "./Swatches";

const SUBTEXT = "Pick a size and watch the room change. You can change it anytime.";
const HELPER = "Pick a size and watch the room change.";

/** The configurator panel (left column on desktop, below the scene on mobile). */
export function Panel({ c }: { c: Configurator }) {
  const { category, size } = c;
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between">
        <Logo />
        <a href="#save" className="-my-2 py-3 text-[12px] text-muted transition-colors hover:text-fg">
          Save &amp; finish later
        </a>
      </header>

      <div className="mt-10 flex flex-1 flex-col justify-center desk:mt-12">
        <div className="@container w-full max-w-[400px]">
          <StepIndicator />

          <h1 className="mt-6 text-[24px] font-medium leading-[1.2] tracking-[-0.02em] text-fg">
            <CrossfadeText text={category.heading} />
          </h1>
          <p className="mt-2 text-[13px] leading-[1.5] text-muted">{SUBTEXT}</p>

          <SegmentedGroup<CategoryId>
            label="Category"
            size="lg"
            className="mt-7"
            columns="desk:grid-cols-2 desk:@[23rem]:grid-cols-4"
            value={c.categoryId}
            onChange={c.setCategory}
            options={CATEGORIES.map((cat) => ({ value: cat.id, label: cat.label }))}
          />

          <div className="mt-7">
            <span className="label" id="model-label">
              Model
            </span>
            <div
              role="textbox"
              aria-readonly="true"
              aria-labelledby="model-label"
              className="mt-2.5 flex h-9 w-full items-center overflow-hidden rounded-lg border border-line bg-input px-3 text-[13px] text-fg"
            >
              <CrossfadeText text={size.name} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="label">Finish</span>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted">{c.finish.label}</span>
              <Swatches finishes={category.finishes} value={c.finish.id} onChange={c.setFinish} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {category.id === "living" && (
              <motion.div
                key="style"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-6">
                  <span className="label">Style</span>
                  <SegmentedGroup<CouchStyle>
                    label="Style"
                    className="mt-2.5"
                    value={c.style}
                    onChange={c.setStyle}
                    options={COUCH_STYLES.map((s) => ({ value: s.id, label: s.label }))}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6">
            <span className="label">Size</span>
            <SegmentedGroup<number>
              label="Size"
              className="mt-2.5"
              value={c.slot}
              onChange={c.setSlot}
              options={category.sizes.map((s, i) => ({ value: i, label: <CrossfadeText text={s.label} /> }))}
            />
            <p className="mt-2.5 text-[12px] text-muted">{HELPER}</p>
          </div>

          <div className="mt-7 flex items-baseline justify-between border-t border-line pt-5">
            <span className="text-[12px] text-muted">Price</span>
            <PriceRoll value={size.price} className="text-[24px] font-medium tabular-nums tracking-[-0.02em] text-fg" />
          </div>

          <div className="mt-5 flex gap-2">
            <button type="button" className="btn-secondary h-10 px-4 text-[13px]">
              Back
            </button>
            <button type="button" className="btn-primary h-10 flex-1 text-[13px]">
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-[11px] text-muted">
        Need help?{" "}
        <a href="#stylist" className="inline-block py-3 text-fg/80 underline-offset-2 hover:underline desk:py-0">
          Ask our stylist
        </a>
      </footer>
    </div>
  );
}

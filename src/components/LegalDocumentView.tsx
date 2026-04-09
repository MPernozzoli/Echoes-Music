import type { LegalSection } from "@/legal/types";

type LegalDocumentViewProps = {
  sections: LegalSection[];
};

const LegalDocumentView = ({ sections }: LegalDocumentViewProps) => (
  <article className="max-w-3xl mx-auto px-4 md:px-6 py-10 pb-24 md:pb-12 font-body">
    <div className="space-y-10">
      {sections.map((section, i) => (
        <section key={i}>
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground mb-4">{section.title}</h2>
          <div className="space-y-3">
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  </article>
);

export default LegalDocumentView;

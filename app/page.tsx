import ContactForm from "./components/ContactForm";

const highlights = [
  {
    eyebrow: "Instant follow-up",
    title: "A sharper first impression",
    description:
      "Present your form like a polished campaign page instead of a plain utility screen.",
  },
  {
    eyebrow: "Own your channel",
    title: "Messages from your WhatsApp",
    description:
      "Keep confirmations personal by sending from the authenticated account already linked to the app.",
  },
  {
    eyebrow: "Regional support",
    title: "Built for India and Nepal",
    description:
      "The form keeps phone entry simple while matching the number formats you support today.",
  },
];

const proofPoints = [
  "Authenticated WhatsApp session",
  "Fast confirmation flow",
  "Clean mobile-friendly layout",
];

export default function Home() {
  return (
    <main className="contact-shell">
      <section className="hero-grid">
      <h1 className="hero-title" />
        <div className="form-column">
          <ContactForm />
        </div>
      </section>
    </main>
  );
}

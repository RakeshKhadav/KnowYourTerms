import { Link } from "react-router-dom";
import gemini from "../../assets/gemini.png";
import indiankanoon from "../../assets/indiankanoon.png";
import vertexAi from "../../assets/vertex.webp";
import { useTranslation } from "react-i18next";

export default function LandingPage() {
  const { t } = useTranslation();
  return (
    <main className="flex flex-col items-center justify-center w-full bg-white">
      {/* Features Section */}
      <section className="w-full max-w-6xl mx-auto py-20 bg-white rounded-3xl mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-black">{t("landing.features_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard icon="📝" title={t("landing.features.agreement_summary.title")} desc={t("landing.features.agreement_summary.desc")} />
          <FeatureCard icon="🤖" title={t("landing.features.legal_chatbot.title")} desc={t("landing.features.legal_chatbot.desc")} />
          <FeatureCard icon="⚖️" title={t("landing.features.case_summary.title")} desc={t("landing.features.case_summary.desc")} />
          <FeatureCard icon="🌐" title={t("landing.features.language_translation.title")} desc={t("landing.features.language_translation.desc")} />
          <FeatureCard icon="📚" title={t("landing.features.agreement_process_guides.title")} desc={t("landing.features.agreement_process_guides.desc")} />
          <FeatureCard icon="📝" title={t("landing.features.template_creation.title")} desc={t("landing.features.template_creation.desc")} />
          <FeatureCard icon="🎬" title={t("landing.features.visual_video_summary.title")} desc={t("landing.features.visual_video_summary.desc")} />
          <FeatureCard icon="🔍" title={t("landing.features.document_review.title")} desc={t("landing.features.document_review.desc")} />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 bg-[#e8eaf6] rounded-3xl shadow mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-black">{t("landing.how_it_works_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <Step icon="📤" number="1" title={t("landing.how_it_works.step1.title")} desc={t("landing.how_it_works.step1.desc")} />
          <Step icon="🤖" number="2" title={t("landing.how_it_works.step2.title")} desc={t("landing.how_it_works.step2.desc")} />
          <Step icon="✨" number="3" title={t("landing.how_it_works.step3.title")} desc={t("landing.how_it_works.step3.desc")} />
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center bg-white rounded-3xl shadow mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-black">{t("landing.powered_by_title")}</h2>
        <p className="text-lg text-gray-700 mb-8">{t("landing.tech_stack.description")}</p>
        <div className="flex flex-wrap justify-center gap-6">
          <TechBadge imgSrc={gemini} name={t("landing.tech_stack.google_gemini")} />
          <TechBadge imgSrc="https://www.svgrepo.com/show/306500/openid.svg" name="JWT Authentication" />
          <TechBadge imgSrc="https://www.svgrepo.com/show/331488/mongodb.svg" name="MongoDB Atlas" />
          <TechBadge imgSrc="https://upload.wikimedia.org/wikipedia/commons/d/db/Google_Translate_Icon.png" name={t("landing.tech_stack.google_translate")} />
          <TechBadge imgSrc={vertexAi} name={t("landing.tech_stack.vertex_ai")} />
          <TechBadge imgSrc={indiankanoon} name={t("landing.tech_stack.indiankanoon")} />
        </div>
      </section>

      {/* Audience Section */}
      <section className="w-full max-w-6xl mx-auto py-20 rounded-3xl mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-black">{t("landing.who_is_it_for_title")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
          <AudienceCard icon="🎓" title={t("landing.audience.students")} desc={t("landing.audience_desc.students")} />
          <AudienceCard icon="🧑‍💼" title={t("landing.audience.business_owners")} desc={t("landing.audience_desc.business_owners")} />
          <AudienceCard icon="👩‍⚖️" title={t("landing.audience.judges")} desc={t("landing.audience_desc.judges")} />
          <AudienceCard icon="📰" title={t("landing.audience.journalists")} desc={t("landing.audience_desc.journalists")} />
          <AudienceCard icon="🧑‍🎓" title={t("landing.audience.law_students")} desc={t("landing.audience_desc.law_students")} />
          <AudienceCard icon="🧑‍🤝‍🧑" title={t("landing.audience.citizens")} desc={t("landing.audience_desc.citizens")} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="w-full max-w-6xl mx-auto px-6 py-20 text-center bg-white rounded-3xl shadow mb-8">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-black">{t("landing.cta_title")}</h2>
        <p className="text-lg text-gray-700 mb-8">{t("landing.cta_subtitle")}</p>
        <Link
          to="/dashboard"
          className="bg-gradient-to-br from-[#e5e7eb] via-[#f3f4f6] to-[#f9fafb] text-gray-800 hover:bg-[#e0e7ef] focus:ring-[#b1b4b6] border border-[#b1b4b6] hover:from-[#e0e7ef] hover:via-[#f3f4f6] hover:to-[#f9fafb] font-bold px-8 py-3 rounded-full shadow-lg transition text-lg tracking-wide"
        >
          {t("landing.try_demo")}
        </Link>
      </section>
    </main>
  );
}

/* -------------------- Reusable Components -------------------- */
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-[#f5f7fa] shadow rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition border border-[#e0e3ef]">
      <div className="w-14 h-14 flex items-center justify-center mb-4 text-3xl bg-white rounded-full border border-[#e0e3ef] shadow-sm">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-black">{title}</h3>
      <p className="text-gray-700 text-sm">{desc}</p>
    </div>
  );
}

function Step({ icon, number, title, desc }: { icon: React.ReactNode; number: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative mb-4">
        <div className="w-16 h-16 flex items-center justify-center rounded-full bg-white border-4 border-[#1a237e] shadow text-3xl">{icon}</div>
        <span className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center rounded-full bg-[#1a237e] text-white text-base font-bold border-2 border-white shadow">{number}</span>
      </div>
      <h3 className="text-xl font-semibold mb-2 text-black">{title}</h3>
      <p className="text-gray-700 text-sm">{desc}</p>
    </div>
  );
}

function TechBadge({ imgSrc, name }: { imgSrc: string; name: string }) {
  return (
    <span className="flex items-center gap-2 px-4 py-2 bg-[#e8eaf6] rounded-full border border-[#c5cae9] text-sm font-medium shadow-sm text-black">
      <img src={imgSrc} alt={name + ' logo'} className="w-6 h-6 object-contain rounded bg-white" />
      {name}
    </span>
  );
}

function AudienceCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-[#f5f7fa] shadow rounded-2xl p-6 flex flex-col items-center text-center hover:shadow-lg transition border border-[#e0e3ef]">
      <div className="w-12 h-12 flex items-center justify-center mb-3 text-2xl bg-white rounded-full border border-[#e0e3ef] shadow-sm">{icon}</div>
      <h3 className="text-lg font-semibold text-black mb-1">{title}</h3>
      <p className="text-gray-700 text-xs">{desc}</p>
    </div>
  );
}

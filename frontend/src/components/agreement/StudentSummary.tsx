import { FileText } from "lucide-react";
import React from "react";
import type { ClauseCitation, DeterministicRiskFinding } from "../../types";

interface Clause {
  title: string;
  explanation: string;
  example: string;
  questionsToAsk: string[];
  citations?: ClauseCitation[];
}

interface StudentOutput {
  title: string;
  about: string;
  clauses: Clause[];
  keyLegalNotes: string[];
  finalTips: string[];
  deterministicRiskFindings?: DeterministicRiskFinding[];
}

const getSeverityBadgeClasses = (severity: DeterministicRiskFinding["severity"]) => {
  if (severity === "high") return "bg-red-100 text-red-700 border-red-200";
  if (severity === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-emerald-100 text-emerald-700 border-emerald-200";
};

const StudentSummary: React.FC<{ aiRawOutput: StudentOutput }> = ({ aiRawOutput }) => {
  const deterministicFindings = Array.isArray(aiRawOutput.deterministicRiskFindings)
    ? aiRawOutput.deterministicRiskFindings
    : [];

  return (
    <div className="max-w-6xl mx-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-0 flex flex-col h-[60vh]">
      {/* Fixed Header */}
      <header className="border-b px-6 py-6 bg-white rounded-t-2xl z-10 sticky top-0">
        <h1 className="text-xl font-bold text-gray-900">{aiRawOutput.title}</h1>
      </header>
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
            <FileText className="w-5 h-5 mr-2" /> About
          </h2>
          <p className="text-gray-700 leading-relaxed">{aiRawOutput.about}</p>
        </section>

        {/* Clauses */}
        <section>
          <h3 className="text-lg font-semibold text-neutral-800 mb-3">Important Clauses</h3>
          <div className="space-y-4">
            {aiRawOutput.clauses.map((clause, i) => (
              <div
                key={i}
                className=" border-l-4 border-gray-500 pl-4"
              >
                <div className="font-medium text-neutral-900 mb-1">{clause.title}</div>
                <div className="text-neutral-700 text-sm">{clause.explanation}</div>
                {Array.isArray(clause.citations) && clause.citations.length > 0 && (
                  <ul className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                    {clause.citations.map((citation, citationIndex) => (
                      <li key={`${citation.location}-${citationIndex}`} className="text-xs text-slate-700">
                        <span className="font-semibold">{citation.location}:</span> "{citation.quote}"
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Key Legal Notes */}
        <section>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">Key Legal Notes</h3>
          <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-sm">
            {aiRawOutput.keyLegalNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>

        {/* Final Tips */}
        <section>
          <h3 className="text-lg font-semibold text-neutral-800 mb-2">Final Tips</h3>
          <ul className="list-disc pl-6 space-y-1 text-neutral-700 text-sm">
            {aiRawOutput.finalTips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>

        {deterministicFindings.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-neutral-800 mb-3">Deterministic Risk Checks</h3>
            <div className="space-y-3">
              {deterministicFindings.map((finding) => (
                <div key={finding.ruleId} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="text-base font-semibold text-gray-800">{finding.title}</p>
                    <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full border ${getSeverityBadgeClasses(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{finding.issue}</p>
                  <p className="text-sm text-blue-700 mb-3">
                    <strong>Recommendation:</strong> {finding.recommendation}
                  </p>
                  <ul className="space-y-2">
                    {finding.citations.map((citation, index) => (
                      <li key={`${finding.ruleId}-${citation.location}-${index}`} className="text-xs text-slate-700">
                        <span className="font-semibold">{citation.location}:</span> "{citation.quote}"
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer Branding (Web) */}
        <footer className="pt-6 mt-8 border-t border-gray-100 text-center text-xs text-neutral-400">
          Generated by <span className="font-semibold">Know Your Terms</span>
        </footer>
      </div>
    </div>
  );
};

export default StudentSummary;

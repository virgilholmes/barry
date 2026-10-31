import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/components/legal-document";
import { legalPolicies } from "@/lib/legal";

export const metadata: Metadata = {
  title: legalPolicies.terms.title,
  description: legalPolicies.terms.description,
};

const sections: LegalSection[] = [
  {
    id: "about",
    title: "About Barry and these terms",
    content: (
      <>
        <p>
          Barry is an accessibility-focused project designed to help people
          communicate during healthcare visits. These Terms and Conditions apply
          to the Barry website and the application features made available to you
          (the “Service”). “Barry,” “we,” “us,” and “our” mean the team providing
          the Service.
        </p>
        <p>
          By using the Service, you agree to these terms. If you do not agree,
          please stop using it. The{" "}
          <Link href={legalPolicies.agreement.href}>End User Agreement</Link>{" "}
          also governs your use of the software, and the{" "}
          <Link href={legalPolicies.cookies.href}>Cookie Policy</Link> explains
          our current use of browser storage.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "Who can use Barry",
    content: (
      <>
        <p>
          You must be legally able to enter into these terms under the laws that
          apply to you. If you cannot do so independently, a parent, legal
          guardian, or other legally authorized representative must agree on
          your behalf and support your use as appropriate.
        </p>
        <p>
          If you help someone use Barry, act with their permission or valid legal
          authority. Respect their preferences, privacy, and right to take part
          in decisions. A disability or communication difference does not, by
          itself, give another person permission to act on their behalf.
        </p>
      </>
    ),
  },
  {
    id: "healthcare",
    title: "Communication support and medical decisions",
    content: (
      <>
        <p>
          Barry is designed to support communication. It does not provide medical
          advice, diagnosis, treatment, or emergency monitoring, and using it
          does not create a healthcare professional–patient relationship with
          the Barry team.
        </p>
        <p>
          Any automated response, transcription, summary, or suggested wording
          may be inaccurate, incomplete, or out of date. Check important details,
          especially medication names, doses, allergies, and care instructions,
          with a qualified healthcare professional before relying on them. Barry
          does not make treatment decisions or give consent to treatment for you.
        </p>
        <p>
          Do not delay or replace professional care because of Barry. For a
          medical emergency, contact your local emergency services directly.
        </p>
      </>
    ),
  },
  {
    id: "responsibilities",
    title: "Your information and responsibilities",
    content: (
      <>
        <p>
          Provide information you are entitled to share and keep it accurate to
          the best of your knowledge. Review information before allowing it to
          represent you or someone you support.
        </p>
        <p>
          You keep any rights you have in the information and other material you
          submit. You permit Barry to process that material as needed to provide
          the features you choose. This permission does not transfer ownership of
          your material to us or, by itself, authorize unrelated advertising or
          model training. These terms are not a substitute for any separate
          privacy information or consent required for a particular feature.
        </p>
        <p>
          Protect access to your device and any credentials provided to you.
          Only access or share another person’s information with appropriate
          permission or legal authority.
        </p>
      </>
    ),
  },
  {
    id: "recording",
    title: "Microphone use and recording consent",
    content: (
      <>
        <p>
          If a listening, recording, or transcription feature is available, use
          it only after informing participants and obtaining the permissions
          required by applicable law and the healthcare setting. Browser
          microphone permission is separate from the consent of the people in
          the conversation.
        </p>
        <p>
          Respect a participant’s decision to decline or withdraw consent, and
          stop the feature when required. Agreement to these terms does not
          itself authorize recording, sharing medical information, or making
          decisions for another person.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>Use Barry lawfully and with respect for others. You must not:</p>
        <ul>
          <li>
            Impersonate another person or misrepresent medical information,
            consent, or your authority to act for someone.
          </li>
          <li>
            Upload or disclose information you do not have the right to use, or
            violate another person’s privacy or intellectual property rights.
          </li>
          <li>
            Harass others, distribute malicious software, bypass access
            controls, or disrupt the Service.
          </li>
          <li>
            Present Barry’s output as a verified clinical record or a substitute
            for a healthcare professional’s judgment.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "ownership",
    title: "Our software and third-party services",
    content: (
      <>
        <p>
          Barry and its licensors retain rights in the Service’s software,
          branding, and original content. Your permission to use the software is
          described in the{" "}
          <Link href={legalPolicies.agreement.href}>End User Agreement</Link>.
          Separately licensed components remain subject to their own licenses.
        </p>
        <p>
          Links to external websites do not mean that Barry endorses or controls
          them. If you choose to use a third-party service, its own terms and
          privacy practices apply to your interaction with it.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and ending access",
    content: (
      <>
        <p>
          Barry is an evolving project. Features may be changed, interrupted, or
          discontinued. We do not promise that every described or planned feature
          is currently available or that the Service will always be accessible,
          error-free, or suitable for every situation.
        </p>
        <p>
          You may stop using Barry at any time. We may restrict or suspend access
          when reasonably necessary to address misuse, a breach of these terms,
          security issues, or legal requirements. Where reasonably possible and
          lawful, we will explain the reason. Keep independent access to any
          information you need for your care.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Warranties, liability, and your rights",
    content: (
      <>
        <p>
          To the extent permitted by applicable law, the Service is provided “as
          is” and “as available,” without warranties of accuracy, fitness for a
          particular purpose, or uninterrupted operation. To that same extent,
          the Barry team is not liable for indirect or consequential losses
          arising from use of, or inability to use, the Service.
        </p>
        <p>
          Nothing in these terms excludes or limits liability that cannot
          lawfully be excluded or limited, or takes away mandatory consumer,
          privacy, accessibility, or other statutory rights. Any limitation
          applies only as far as the law allows.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes and interpretation",
    content: (
      <>
        <p>
          We may update these terms as Barry develops. Updated terms will appear
          on this page with a revised date. Where additional notice or agreement
          is legally required, we will provide or request it before applying the
          change. If you do not agree to updated terms, stop using the Service.
        </p>
        <p>
          If a provision is unenforceable, the remaining provisions continue to
          apply to the extent permitted by law. The End User Agreement governs
          software licensing if its licensing provisions conflict with these
          terms; these terms govern general use of the Service.
        </p>
      </>
    ),
  },
];

export default function TermsAndConditionsPage() {
  return (
    <LegalDocument
      policy="terms"
      summary={[
        "Barry supports healthcare communication. Medical decisions stay with you and your healthcare professionals.",
        "Use information you have permission to share, check important details, and obtain consent before using recording features.",
        "You keep your rights in your information and may stop using Barry at any time.",
      ]}
      sections={sections}
    />
  );
}

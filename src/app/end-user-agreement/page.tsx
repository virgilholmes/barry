import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, type LegalSection } from "@/components/legal-document";
import { legalPolicies } from "@/lib/legal";

export const metadata: Metadata = {
  title: legalPolicies.agreement.title,
  description: legalPolicies.agreement.description,
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "About this agreement",
    content: (
      <>
        <p>
          This End User Agreement is a software license agreement between you
          and the team providing Barry (“Barry,” “we,” “us,” or “our”). It applies
          to the Barry application and any updates, associated interfaces, and
          documentation we make available (the “Software”).
        </p>
        <p>
          By using the Software, you agree to this agreement and the{" "}
          <Link href={legalPolicies.terms.href}>Terms and Conditions</Link>. If
          you do not agree, do not use the Software. If you are agreeing for
          another person or an organization, you must have the legal authority
          to do so. Receiving help with communication does not itself transfer
          anyone’s decision-making authority.
        </p>
      </>
    ),
  },
  {
    id: "license",
    title: "Your license to use Barry",
    content: (
      <>
        <p>
          Subject to this agreement, Barry grants you a limited, non-exclusive,
          non-transferable license to access and use the Software for lawful
          healthcare communication and related personal, caregiving, or
          authorized professional support. This license lasts while your access
          is authorized and you comply with these terms.
        </p>
        <p>
          The Software is licensed, not sold. This agreement does not transfer
          ownership of the Software, Barry’s branding, or its original materials
          to you. Barry and its licensors retain rights not expressly granted.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "Your voice and your decisions",
    content: (
      <>
        <p>
          Barry is designed to help people participate in healthcare
          conversations. It is not a healthcare professional, emergency service,
          legal representative, or substitute decision-maker. It cannot provide
          medical consent on your behalf.
        </p>
        <p>
          Review any generated answers, transcriptions, summaries, or suggested
          wording before relying on or sharing them. Automated output can contain
          errors or omit context, even when it sounds confident. Confirm health
          information and treatment decisions with a qualified healthcare
          professional.
        </p>
        <p>
          If you support someone else, use Barry in line with their preferences
          and your actual authority. Do not use the Software to override their
          choices or falsely represent their agreement.
        </p>
      </>
    ),
  },
  {
    id: "information",
    title: "Your information and permissions",
    content: (
      <>
        <p>
          You keep any rights you have in information you provide. This software
          license does not give Barry ownership of your personal information or
          medical records. Provide only material you are entitled to share, and
          use information about another person only with appropriate permission
          or legal authority.
        </p>
        <p>
          If a microphone, recording, or transcription feature is available,
          obtain all permissions required by law and the setting before using
          it. Browser permission alone does not establish participant consent.
          Stop recording when required if consent is declined or withdrawn.
        </p>
        <p>
          This agreement is not blanket consent to access a microphone, process
          sensitive information, or share a conversation. Any feature-specific
          privacy information and permissions apply separately. See the{" "}
          <Link href={legalPolicies.cookies.href}>Cookie Policy</Link> for
          Barry’s current browser-storage practices.
        </p>
      </>
    ),
  },
  {
    id: "restrictions",
    title: "License restrictions",
    content: (
      <>
        <p>Except where applicable law or a separate license permits it, do not:</p>
        <ul>
          <li>
            Sell, sublicense, redistribute, or commercially exploit the Software
            itself without permission.
          </li>
          <li>
            Copy, modify, reverse engineer, or attempt to extract proprietary
            source code from the Software.
          </li>
          <li>
            Remove ownership notices, evade technical access controls, or gain
            unauthorized access to systems or information.
          </li>
          <li>
            Introduce malicious code, interfere with other users, or use the
            Software for unlawful, deceptive, or privacy-infringing activities.
          </li>
        </ul>
        <p>
          These restrictions do not prevent lawful use of assistive technology,
          exercise of statutory rights, or activities expressly permitted by an
          applicable open-source license.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates, compatibility, and other software",
    content: (
      <>
        <p>
          Features and technical requirements may evolve. You are responsible
          for having a compatible device, browser, and connection, and for any
          charges from your connection provider. We may update or discontinue
          features and do not guarantee that planned features will become
          available or that every device will be supported.
        </p>
        <p>
          Third-party and open-source components remain subject to their own
          licenses and notices. Those licenses govern their components if they
          conflict with this agreement. External services you choose to use may
          also have separate terms.
        </p>
      </>
    ),
  },
  {
    id: "warranties",
    title: "Warranties and limits of liability",
    content: (
      <>
        <p>
          To the extent permitted by law, the Software is provided “as is” and
          “as available,” without warranties of accuracy, fitness for a
          particular purpose, or uninterrupted or error-free operation. Barry
          does not guarantee any medical or communication outcome.
        </p>
        <p>
          To the extent permitted by law, the Barry team is not liable for
          indirect or consequential losses arising from your use of, or
          inability to use, the Software. Nothing in this agreement excludes
          liability that cannot lawfully be excluded or limits mandatory
          consumer, privacy, accessibility, or other statutory rights.
        </p>
      </>
    ),
  },
  {
    id: "ending",
    title: "Ending this agreement",
    content: (
      <>
        <p>
          You may end your use of the Software at any time. Barry may suspend or
          end this license for a material breach of this agreement, unlawful
          use, or when necessary to protect the Service or comply with law. We
          will provide notice where reasonably possible and legally required.
        </p>
        <p>
          When the license ends, stop using the Software and remove any copies
          licensed solely under this agreement that you control. This does not
          require you to delete your own medical records or information, or
          materials you may retain under another license or applicable law.
          Provisions about ownership, liability, and rights arising before
          termination continue to apply to the extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "interpretation",
    title: "Changes and related terms",
    content: (
      <>
        <p>
          Changes to this agreement will be published here with an updated date.
          Where required by law, we will give additional notice or request your
          agreement before applying a change. If you disagree with an update,
          stop using the Software.
        </p>
        <p>
          The Terms and Conditions govern general use of the Service. This
          agreement governs software licensing if its licensing provisions
          conflict with those terms. If one provision is unenforceable, the
          remaining provisions continue to apply to the extent permitted by law.
        </p>
      </>
    ),
  },
];

export default function EndUserAgreementPage() {
  return (
    <LegalDocument
      policy="agreement"
      summary={[
        "You receive permission to use Barry for healthcare communication and authorized support; ownership of the software stays with its owners.",
        "Your information remains yours. Using Barry does not give it authority to make decisions or provide medical consent for you.",
        "Review automated output, respect recording permissions, and use the software lawfully. You may stop using it at any time.",
      ]}
      sections={sections}
    />
  );
}

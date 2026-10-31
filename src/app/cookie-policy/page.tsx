import type { Metadata } from "next";
import { LegalDocument, type LegalSection } from "@/components/legal-document";
import { legalPolicies } from "@/lib/legal";

export const metadata: Metadata = {
  title: legalPolicies.cookies.title,
  description: legalPolicies.cookies.description,
};

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "What this policy covers",
    content: (
      <>
        <p>
          This Cookie Policy explains how the Barry website and application use
          cookies and similar browser storage. “Barry,” “we,” “us,” and “our” mean
          the team providing Barry. This policy describes the current version of
          the app as of the date above.
        </p>
        <p>
          This policy is about technologies on your device. It does not describe
          every kind of information a future voice, account, or healthcare
          feature might process.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Cookies and similar technologies",
    content: (
      <>
        <p>
          Cookies are small pieces of information a website asks your browser to
          store. They can be sent back to that website with later requests.
          Session cookies generally last for a browsing session; persistent
          cookies remain until they expire or you delete them. Cookies can be
          set by the site you visit or by a third party.
        </p>
        <p>
          Local storage and session storage are other ways a website can save
          information in your browser. Unlike cookies, that information is not
          automatically sent with each request. Local storage can remain until
          cleared; session storage normally lasts for the life of a browser tab.
        </p>
      </>
    ),
  },
  {
    id: "current-use",
    title: "What Barry currently uses",
    content: (
      <>
        <p>
          Barry currently does not set application cookies or save information
          in local storage or session storage. We have not integrated analytics,
          advertising, or cross-site tracking tools into the app.
        </p>
        <ul>
          <li>
            <strong>Essential cookies:</strong> none currently set by Barry.
          </li>
          <li>
            <strong>Preference storage:</strong> none currently used. The app
            follows your device’s light or dark appearance setting without
            storing a separate preference.
          </li>
          <li>
            <strong>Analytics cookies:</strong> none currently used.
          </li>
          <li>
            <strong>Advertising and tracking cookies:</strong> none currently
            used.
          </li>
        </ul>
        <p>
          There are therefore no Barry cookie names, storage keys, or retention
          periods to list for this version. The absence of cookies does not mean
          that no technical information is transmitted: loading a website still
          sends information such as your IP address and browser request details
          to the servers delivering it.
        </p>
      </>
    ),
  },
  {
    id: "choices",
    title: "Your choices and browser controls",
    content: (
      <>
        <p>
          Because Barry currently uses no optional cookies or browser storage,
          there are no optional cookie preferences to save or withdraw in the
          app. You can read and use the current site without accepting optional
          tracking.
        </p>
        <p>
          Most browsers let you inspect, block, or delete cookies and site data
          in their privacy or site settings. These choices usually apply to the
          browser and device where you make them. Consult your browser’s help
          for instructions. Clearing site data does not itself delete any
          information held separately by a service.
        </p>
        <p>
          If Barry later introduces optional storage, we will explain its
          purpose, provider, and duration, request consent before using it where
          required, and provide a way to change or withdraw that consent.
        </p>
      </>
    ),
  },
  {
    id: "permissions",
    title: "Microphone permissions and external sites",
    content: (
      <>
        <p>
          Microphone permissions are separate from cookies. Reading this policy
          or agreeing to other Barry terms does not grant microphone access or
          permission to record anyone. If a voice feature is introduced, your
          browser’s site permissions can be used to manage microphone access;
          participant consent must be handled separately.
        </p>
        <p>
          If you follow a link to another website, that website may use its own
          cookies and storage under its own policies. Barry’s policy does not
          control storage used by external sites, browser extensions, or your
          browser itself.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    title: "Updates to this policy",
    content: (
      <p>
        We will update this page and its date when Barry’s use of cookies or
        similar storage changes. Any newly required consent will be requested
        before the relevant optional technology is activated. You can return to
        this policy from the legal links at the bottom of every page.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      policy="cookies"
      summary={[
        "Barry currently uses no application cookies, local storage, or session storage.",
        "There are no analytics or advertising trackers integrated into the app.",
        "You control your browser’s site data and permissions. We will update this policy if our use of storage changes.",
      ]}
      sections={sections}
    />
  );
}

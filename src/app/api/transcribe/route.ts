import { auth } from "@clerk/nextjs/server";
import { Sha256 } from "@aws-crypto/sha256-js";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { formatUrl } from "@aws-sdk/util-format-url";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { connection } from "next/server";
import { z } from "zod";

// Transcribe needs IAM credentials (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY,
// a profile, or a role). Bedrock API keys don't work for Transcribe.
const region = process.env.TRANSCRIBE_REGION ?? process.env.AWS_REGION ?? "us-east-1";
const medical = process.env.TRANSCRIBE_MEDICAL === "true";
const credentials = fromNodeProviderChain();

const LANGUAGES = ["en-US", "en-GB", "en-AU", "en-IN", "es-US", "es-ES", "fr-FR", "fr-CA", "de-DE", "it-IT", "pt-BR", "ja-JP", "ko-KR", "zh-CN", "hi-IN"];
const DEFAULTS: Record<string, string> = { en: "en-US", es: "es-US", fr: "fr-FR", de: "de-DE", it: "it-IT", pt: "pt-BR", ja: "ja-JP", ko: "ko-KR", zh: "zh-CN", hi: "hi-IN" };

function languageFor(requested: string) {
  if (medical) return "en-US";
  if (LANGUAGES.includes(requested)) return requested;
  return DEFAULTS[requested.split("-")[0]] ?? "en-US";
}

let available: { value: Promise<boolean>; at: number } | null = null;

function transcribeAvailable() {
  if (!available || Date.now() - available.at > 60_000) {
    available = { value: credentials().then(() => true, () => false), at: Date.now() };
  }
  return available.value;
}

export async function GET() {
  await connection();
  return Response.json({ enabled: await transcribeAvailable() });
}

const body = z.object({
  language: z.string().max(20).default("en-US"),
  purpose: z.enum(["room", "dictation"]).default("dictation"),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Please sign in to use Barry." }, { status: 401 });
  if (!(await transcribeAvailable())) {
    return Response.json({ error: "Amazon Transcribe isn't set up yet." }, { status: 503 });
  }

  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "That request wasn't valid." }, { status: 400 });
  const { language, purpose } = parsed.data;

  const hostname = `transcribestreaming.${region}.amazonaws.com`;
  const query: Record<string, string> = medical
    ? {
        "language-code": "en-US",
        "media-encoding": "pcm",
        "sample-rate": "16000",
        specialty: "PRIMARYCARE",
        type: purpose === "room" ? "CONVERSATION" : "DICTATION",
      }
    : {
        "language-code": languageFor(language),
        "media-encoding": "pcm",
        "sample-rate": "16000",
        "enable-partial-results-stabilization": "true",
        "partial-results-stability": "medium",
      };

  const signer = new SignatureV4({ credentials, region, service: "transcribe", sha256: Sha256 });
  const signed = await signer.presign(
    new HttpRequest({
      method: "GET",
      protocol: "wss:",
      hostname,
      port: 8443,
      path: medical ? "/medical-stream-transcription-websocket" : "/stream-transcription-websocket",
      headers: { host: `${hostname}:8443` },
      query,
    }),
    { expiresIn: 300 },
  );

  return Response.json({ url: formatUrl(signed) });
}

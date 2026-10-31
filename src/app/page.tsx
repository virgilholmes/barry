import Link from "next/link";
import { Suspense } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { AudioLines, BadgeCheck, Check, Ear, HeartHandshake, ShieldCheck, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroVideo } from "@/components/hero-video";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const container = "mx-auto w-full max-w-[96rem] px-5 sm:px-10";

const PHRASES = [
  "Please slow down",
  "Can you say that again?",
  "Please use simpler words",
  "Please talk to me directly",
  "I need a moment",
];

const PRINCIPLES = [
  {
    icon: Ear,
    title: "Listens only with permission",
    text: "Barry starts only after you confirm everyone in the room is OK with it.",
  },
  {
    icon: ShieldCheck,
    title: "Shares only what you allow",
    text: "You choose what Barry can say in appointments. He never shares anything else.",
  },
  {
    icon: HeartHandshake,
    title: "Big choices stay yours",
    text: "He never answers for you about treatment, consent, pain or feelings.",
  },
  {
    icon: BadgeCheck,
    title: "Nothing made up",
    text: "Barry only answers from what you’ve told him. When he isn’t sure, he asks you.",
  },
];

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-white text-stone-900 selection:bg-orange-200 selection:text-black">
      <header className="absolute inset-x-0 top-0 z-10 flex h-16 items-center justify-between px-5 sm:h-20 sm:px-10">
        <Link href="/" aria-label="Barry home">
          <Logo className="h-6 brightness-0 invert sm:h-7" />
        </Link>
        <Suspense>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Button asChild size="lg" variant="ghost" className="rounded-full px-4 text-white hover:bg-white/15 hover:text-white">
                <Link href="/sign-in">Log in</Link>
              </Button>
              <Button asChild size="lg" className="rounded-full bg-white px-4 text-black hover:bg-white/85">
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild size="lg" className="rounded-full bg-white px-4 text-black hover:bg-white/85">
                <Link href="/app">Open Barry</Link>
              </Button>
              <UserButton />
            </Show>
          </div>
        </Suspense>
      </header>

      <main className="flex-1">
        <section className="relative isolate flex min-h-dvh flex-col justify-end overflow-hidden bg-neutral-900 px-5 pt-28 pb-10 text-white sm:px-10 sm:pb-14">
          <HeroVideo />
          <div
            aria-hidden
            className="absolute inset-0 -z-30 bg-[url(/hero-poster.jpg)] bg-cover bg-center"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-b from-black/60 via-black/10 via-35% to-black/75"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-linear-to-tr from-black/50 via-transparent via-45%"
          />

          <h1 className="max-w-3xl text-4xl font-medium tracking-tight text-balance sm:text-6xl">
            The voice agent that goes to the doctor with you.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-pretty text-white/80 sm:mt-5 sm:text-xl">
            You brief Barry once. He walks into every appointment with you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StartButton className="bg-white text-black hover:bg-white/85" />
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-full bg-white/10 px-6 text-base text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
            >
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </section>

        <div className={cn(container, "pt-24 sm:pt-32")}>
          <p className="max-w-5xl text-3xl leading-tight font-medium tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
            Too often, disabled patients get talked over, asked confusing questions, and made to tell their whole
            story again. <span className="text-stone-500">Barry helps you take part in your own care.</span>
          </p>
        </div>

        <section id="how-it-works" aria-labelledby="how-it-works-title" className={cn(container, "py-24 sm:py-32")}>
          <Eyebrow>How it works</Eyebrow>
          <h2
            id="how-it-works-title"
            className="mt-4 max-w-3xl text-3xl font-medium tracking-tight text-balance sm:text-5xl"
          >
            With you before, during and after your visit.
          </h2>
          <ol className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-3 lg:gap-6">
            <Step when="Before" title="Tell Barry about you" visual={<SetupCard />}>
              He asks about your medicines, allergies, conditions and how you like to communicate. Answer by talking
              or typing. It takes about two minutes, and you only do it once.
            </Step>
            <Step when="During" title="Bring him into the room" visual={<ListeningCard />}>
              With everyone’s OK, Barry listens to the doctor and helps you answer, at your own pace.
            </Step>
            <Step when="After" title="Leave with a summary" visual={<SummaryCard />}>
              Barry writes down what to do and what changed, plus anything that was unclear so you can ask about it.
            </Step>
          </ol>
        </section>

        <section aria-labelledby="in-the-room-title" className="bg-stone-950 py-24 text-white sm:py-32">
          <div className={container}>
            <Eyebrow className="text-stone-400">In the room</Eyebrow>
            <h2
              id="in-the-room-title"
              className="mt-4 max-w-3xl text-3xl font-medium tracking-tight text-balance sm:text-5xl"
            >
              Every question, made easier to answer.
            </h2>
            <p className="mt-5 max-w-2xl text-lg text-pretty text-stone-400 sm:text-xl">
              Barry listens for questions meant for you and puts each one in plain words. Then he picks the right way to
              help.
            </p>

            <div className="mt-14 grid grid-cols-1 gap-y-14 xl:grid-cols-3 xl:gap-x-6 xl:gap-y-6">
              <Route title="Answers simple things" text="Facts like your allergies or medicines, said out loud for you.">
                <QuestionCard
                  label="Barry answered for you"
                  simple="Are you allergic to any medicines?"
                  asked="Before we start, do you have any allergies to medications?"
                >
                  <div className="mt-auto pt-4">
                    <div className="flex items-center gap-3 rounded-xl bg-orange-50 py-2 pr-2 pl-4">
                      <p className="flex-1 text-lg">I’m allergic to penicillin.</p>
                      <span className="flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium text-orange-700">
                        <Volume2 aria-hidden className="size-4" />
                        Say again
                      </span>
                    </div>
                  </div>
                </QuestionCard>
              </Route>
              <Route
                title="Makes hard questions easier"
                text="Long or confusing questions become plain words and a few big buttons."
              >
                <QuestionCard
                  label="Tap your answer"
                  simple="Have your ankles or feet been more swollen lately?"
                  asked="Have you noticed any swelling in your ankles or feet since we increased the dose of your water pill last month?"
                >
                  <ul className="mt-4 grid grid-cols-2 gap-2">
                    {["Yes, more", "About the same", "No swelling", "Not sure"].map((option, index) => (
                      <li
                        key={option}
                        className={cn(
                          "flex min-h-12 items-center justify-center rounded-xl border px-2 text-center font-medium",
                          index === 0 ? "border-orange-500 bg-orange-500 text-white" : "border-stone-200",
                        )}
                      >
                        {option}
                      </li>
                    ))}
                  </ul>
                </QuestionCard>
              </Route>
              <Route
                title="Leaves the big things to you"
                text="Decisions, consent, pain and feelings are always yours to answer."
              >
                <QuestionCard
                  label="For you to answer"
                  simple="Which do you prefer: a new medicine or a procedure?"
                  asked="We could try a new medication or a procedure. Which would you prefer?"
                >
                  <p className="mt-3 text-stone-500">Take your time. Answer in your own words.</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {["Ask them to repeat", "I need a moment", "Check with Mom (Jane)"].map((phrase) => (
                      <li key={phrase} className="flex h-10 items-center rounded-full border border-stone-200 px-3.5 text-[15px]">
                        {phrase}
                      </li>
                    ))}
                  </ul>
                </QuestionCard>
              </Route>
            </div>

            <div className="mt-16 flex flex-col gap-6 rounded-3xl p-6 ring-1 ring-white/10 sm:p-8 lg:flex-row lg:items-center lg:gap-12">
              <div className="lg:w-96 lg:shrink-0">
                <h3 className="text-xl font-medium sm:text-2xl">Helps you speak up</h3>
                <p className="mt-1.5 text-lg text-pretty text-stone-400">
                  Tap a phrase or type anything, and Barry says it out loud. If you get lost, he notes it so you can
                  ask about it later.
                </p>
              </div>
              <ul className="flex flex-wrap gap-2">
                <li className="flex h-11 items-center rounded-full bg-orange-500 px-4 text-[15px] font-medium">
                  I didn’t understand
                </li>
                {PHRASES.map((phrase) => (
                  <li
                    key={phrase}
                    className="flex h-11 items-center rounded-full border border-white/15 bg-white/5 px-4 text-[15px]"
                  >
                    {phrase}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="in-charge-title"
          className={cn(container, "grid gap-12 py-24 sm:py-32 lg:grid-cols-[5fr_7fr] lg:gap-20")}
        >
          <div>
            <Eyebrow>You’re in charge</Eyebrow>
            <h2 id="in-charge-title" className="mt-4 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
              Barry helps. You decide.
            </h2>
            <p className="mt-5 max-w-md text-lg text-pretty text-stone-600 sm:text-xl">
              He’s there to support you, not to talk over you.
            </p>
          </div>
          <dl className="grid gap-10 sm:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <dt>
                  <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span className="mt-4 block text-lg font-medium">{title}</span>
                </dt>
                <dd className="mt-1 text-lg text-pretty text-stone-600">{text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="get-started-title" className="bg-stone-100">
          <div className={cn(container, "py-24 sm:py-32")}>
            <h2
              id="get-started-title"
              className="max-w-3xl text-4xl font-medium tracking-tight text-balance sm:text-6xl"
            >
              Get Barry ready for your next appointment.
            </h2>
            <p className="mt-5 max-w-xl text-lg text-pretty text-stone-600 sm:text-xl">
              Tell him about you once, and he’ll be there for every visit after.
            </p>
            <div className="mt-8">
              <StartButton className="bg-stone-900 text-white hover:bg-stone-800" />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-stone-100">
        <div
          className={cn(
            container,
            "flex flex-col items-start gap-4 border-t border-stone-200 py-8 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <Logo className="h-5" />
          <p className="max-w-xl">
            Barry isn’t a doctor and can make mistakes. Always check important details with your care team.
          </p>
        </div>
      </footer>
    </div>
  );
}

function StartButton({ className }: { className?: string }) {
  const classes = cn("h-12 rounded-full px-6 text-base", className);
  const getStarted = (
    <Button asChild size="lg" className={classes}>
      <Link href="/sign-up">Get started</Link>
    </Button>
  );

  return (
    <Suspense fallback={getStarted}>
      <Show when="signed-in" fallback={getStarted}>
        <Button asChild size="lg" className={classes}>
          <Link href="/app">Open Barry</Link>
        </Button>
      </Show>
    </Suspense>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-sm font-medium text-stone-500", className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-orange-500" />
      {children}
    </p>
  );
}

function Step({
  when,
  title,
  visual,
  children,
}: {
  when: string;
  title: string;
  visual: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col">
      <div
        aria-hidden
        className="flex items-center justify-center rounded-3xl bg-stone-100 px-5 py-10 sm:px-8 lg:h-[26rem] lg:px-6 xl:px-10"
      >
        {visual}
      </div>
      <p className="mt-6 text-sm font-medium text-stone-500">{when}</p>
      <h3 className="mt-1 text-xl font-medium tracking-tight sm:text-2xl">{title}</h3>
      <p className="mt-2 max-w-md text-lg text-pretty text-stone-600">{children}</p>
    </li>
  );
}

function MockCard({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">{children}</div>;
}

function SetupCard() {
  return (
    <MockCard>
      <p className="text-xs font-medium text-orange-600">3 of 7</p>
      <p className="mt-1 text-lg leading-snug font-semibold">Do you take any medicines?</p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 p-1.5 pl-3">
        <span className="min-w-0 flex-1 truncate text-sm">…and baclofen, ten milligrams three times a day</span>
        <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-orange-500 text-white">
          <span className="absolute inset-0 animate-ping rounded-lg bg-orange-500/40 motion-reduce:hidden" />
          <Square className="relative size-3 fill-current" />
        </span>
      </div>
      <p className="mt-2 text-xs text-orange-700">Listening… I’ll stop when you pause.</p>
      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-stone-100 px-3 py-2">
        <Check className="size-3.5 shrink-0 text-orange-600" strokeWidth={3} />
        <div>
          <p className="text-sm font-medium">Furosemide</p>
          <p className="text-xs text-stone-500">40 mg · Every morning</p>
        </div>
      </div>
    </MockCard>
  );
}

function ListeningCard() {
  return (
    <MockCard>
      <div className="flex items-center gap-3">
        <span className="relative grid size-9 shrink-0 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-orange-500/25 [animation-duration:2s] motion-reduce:hidden" />
          <span className="relative grid size-full place-items-center rounded-full bg-orange-500 text-white">
            <AudioLines className="size-4" />
          </span>
        </span>
        <div className="leading-tight">
          <p className="text-sm font-medium">Listening</p>
          <p className="text-xs text-stone-500">Appointment · 4:12</p>
        </div>
      </div>
      <p className="mt-5 text-lg leading-relaxed text-stone-500">
        “Good to see you again. Let’s check how the new dose is going.”
      </p>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
        <span className="text-sm">Answer simple questions out loud</span>
        <span className="relative h-6 w-10 shrink-0 rounded-full bg-orange-500">
          <span className="absolute top-0.5 left-4.5 size-5 rounded-full bg-white shadow-sm" />
        </span>
      </div>
    </MockCard>
  );
}

function SummaryCard() {
  return (
    <MockCard>
      <p className="text-xs text-stone-500">Thursday, November 12 · 18 min</p>
      <p className="mt-0.5 text-lg font-semibold">Water pill check-in</p>
      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50/60 px-3 py-2.5">
        <p className="text-sm font-semibold">Things to ask about</p>
        <p className="mt-1 flex gap-2 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-orange-500" />
          What does the blood test check?
        </p>
      </div>
      <p className="mt-4 text-sm font-semibold">What to do</p>
      <p className="mt-1.5 flex gap-2 text-sm">
        <span className="mt-0.5 size-4 shrink-0 rounded border border-stone-300" />
        Weigh yourself every morning.
      </p>
      <p className="mt-4 text-sm font-semibold">Medicine changes</p>
      <p className="mt-1.5 flex gap-2 text-sm">
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-stone-300" />
        Water pill: 40 mg to 60 mg each morning.
      </p>
    </MockCard>
  );
}

function Route({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr] md:gap-10 xl:row-span-2 xl:grid-cols-1 xl:grid-rows-subgrid xl:gap-6">
      <div>
        <h3 className="text-xl font-medium sm:text-2xl">{title}</h3>
        <p className="mt-1.5 max-w-md text-lg text-pretty text-stone-400">{text}</p>
      </div>
      {children}
    </div>
  );
}

function QuestionCard({
  label,
  simple,
  asked,
  children,
}: {
  label: string;
  simple: string;
  asked: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl bg-white p-5 text-stone-900">
      <p className="flex items-center gap-2 text-sm font-medium text-stone-500">
        <span aria-hidden className="size-2 rounded-full bg-orange-500" />
        <span className="sr-only">Example: </span>
        {label}
      </p>
      <p className="mt-2 text-xl leading-snug font-semibold text-balance">{simple}</p>
      <p className="mt-1 text-sm text-stone-500">Doctor asked: “{asked}”</p>
      {children}
    </div>
  );
}

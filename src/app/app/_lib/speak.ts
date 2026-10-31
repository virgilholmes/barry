// Speaks text aloud and resolves when Barry is done (or is interrupted).
export function speak(text: string) {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text.trim()) return resolve();
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = navigator.language;
    utterance.rate = 0.95;
    utterance.onend = utterance.onerror = () => resolve();
    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) speechSynthesis.cancel();
}

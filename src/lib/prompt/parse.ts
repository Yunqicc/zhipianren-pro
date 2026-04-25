export function parseLLMOutput(raw: string) {
  const hasVoice = raw.includes("[SEND_VOICE]");
  const photoMatch = raw.match(/\[SEND_PHOTO:\s*(.+?)\]/);

  let cleaned = raw
    .replace(/\[SEND_VOICE\]/g, "")
    .replace(/\[SEND_PHOTO:\s*.+?\]/g, "")
    .trim();

  const parts = cleaned
    .split("[SPLIT]")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    messages: parts,
    voiceTriggered: hasVoice,
    photoPrompt: photoMatch?.[1]?.trim() ?? null,
  };
}

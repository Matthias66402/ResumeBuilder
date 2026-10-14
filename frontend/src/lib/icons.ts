/** Phosphor icon names (https://phosphoricons.com), the set Reactive Resume stores in `icon` fields. */

const NETWORK_ICONS: Record<string, string> = {
  linkedin: "linkedin-logo",
  github: "github-logo",
  gitlab: "gitlab-logo",
  x: "x-logo",
  twitter: "twitter-logo",
  instagram: "instagram-logo",
  facebook: "facebook-logo",
  youtube: "youtube-logo",
  stackoverflow: "stack-overflow-logo",
  medium: "medium-logo",
  dribbble: "dribbble-logo",
  behance: "behance-logo",
  mastodon: "mastodon-logo",
  threads: "threads-logo",
  tiktok: "tiktok-logo",
  reddit: "reddit-logo",
  discord: "discord-logo",
  telegram: "telegram-logo",
  whatsapp: "whatsapp-logo",
  codepen: "codepen-logo",
  figma: "figma-logo",
};

/** Icon for a profile network ("LinkedIn", "Stack Overflow" …); networks without a logo get a globe. */
export function networkIcon(network: string): string {
  const key = network.toLowerCase().replace(/[^a-z]/g, "");
  return key ? (NETWORK_ICONS[key] ?? "globe") : "";
}

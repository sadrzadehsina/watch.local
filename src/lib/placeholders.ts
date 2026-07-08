export type PlaceholderVideo = {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  duration: string;
};

export const sampleVideos: PlaceholderVideo[] = [
  {
    id: "dQw4w9WgXcQ",
    title: "Understanding local-first software architecture",
    channel: "Learning Systems",
    publishedAt: "Today",
    duration: "18:24",
  },
  {
    id: "9bZkp7q19f0",
    title: "A practical guide to thoughtful TypeScript boundaries",
    channel: "Calm Code",
    publishedAt: "Yesterday",
    duration: "26:11",
  },
  {
    id: "3JZ_D3ELwOQ",
    title: "Designing distraction-free tools for daily study",
    channel: "Focused Web",
    publishedAt: "This week",
    duration: "12:08",
  },
];

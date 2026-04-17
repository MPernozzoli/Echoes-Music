import { describe, expect, it } from "vitest";

import type { Song } from "@/data/mockData";
import { dedupeSongVersions } from "@/lib/dedupeSongs";

function makeSong(overrides: Partial<Song>): Song {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? "Song",
    artist: overrides.artist ?? "Artist",
    album: overrides.album ?? "Album",
    artwork: overrides.artwork ?? "artwork.jpg",
    emotionalTags: overrides.emotionalTags ?? ["tag"],
    explanation: overrides.explanation ?? "explanation",
    relevanceScore: overrides.relevanceScore ?? 70,
    ...overrides,
  };
}

describe("dedupeSongVersions", () => {
  it("keeps only the best canonical version of the same work", () => {
    const songs = [
      makeSong({
        id: "studio",
        title: "Oceano Di Silenzio",
        artist: "Franco Battiato",
        relevanceScore: 79,
      }),
      makeSong({
        id: "live",
        title: "Oceano Di Silenzio (Live 1988 / Remastered 2021)",
        artist: "Franco Battiato",
        relevanceScore: 83,
      }),
      makeSong({
        id: "remaster",
        title: "Oceano Di Silenzio (Remastered 2021)",
        artist: "Franco Battiato",
        relevanceScore: 88,
      }),
    ];

    expect(dedupeSongVersions(songs)).toEqual([
      {
        ...songs[2],
        alternateVersions: [
          {
            id: songs[0].id,
            title: songs[0].title,
            artist: songs[0].artist,
            album: songs[0].album,
          },
          {
            id: songs[1].id,
            title: songs[1].title,
            artist: songs[1].artist,
            album: songs[1].album,
          },
        ],
      },
    ]);
  });

  it("does not collapse different songs by the same artist", () => {
    const songs = [
      makeSong({
        id: "a",
        title: "Summer on a Solitary Beach",
        artist: "Franco Battiato",
      }),
      makeSong({
        id: "b",
        title: "Centro di gravita permanente",
        artist: "Franco Battiato",
      }),
    ];

    expect(dedupeSongVersions(songs)).toEqual(songs);
  });
});

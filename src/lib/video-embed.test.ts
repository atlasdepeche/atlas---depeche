import { describe, expect, it } from "vitest";
import { toEmbeddableVideoUrl } from "./video-embed";

describe("toEmbeddableVideoUrl", () => {
  it("converts a youtube watch URL", () => {
    expect(toEmbeddableVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a youtu.be short link", () => {
    expect(toEmbeddableVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a youtube shorts URL", () => {
    expect(toEmbeddableVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a vimeo URL", () => {
    expect(toEmbeddableVideoUrl("https://vimeo.com/123456789")).toBe(
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("returns null for an unrecognized host", () => {
    expect(toEmbeddableVideoUrl("https://example.com/video.mp4")).toBeNull();
  });

  it("returns null for a malformed URL", () => {
    expect(toEmbeddableVideoUrl("not a url")).toBeNull();
  });
});

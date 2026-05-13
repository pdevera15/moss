import { describe, it, expect } from "vitest";
import { mossHighlightStyle, getMossHighlighting } from "./mossTheme";

describe("mossHighlightStyle", () => {
  it("is defined and exported", () => {
    expect(mossHighlightStyle).toBeDefined();
  });

  it("getMossHighlighting returns a defined CM6 extension", () => {
    expect(getMossHighlighting()).toBeDefined();
  });
});

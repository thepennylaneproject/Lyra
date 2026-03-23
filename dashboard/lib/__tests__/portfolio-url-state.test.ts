import { describe, expect, it } from "vitest";
import {
  readPortfolioStateFromSearch,
  searchStringForPortfolioState,
} from "../portfolio-url-state";

describe("readPortfolioStateFromSearch", () => {
  it("forces portfolio view when project is present", () => {
    expect(readPortfolioStateFromSearch("?view=engine&project=my-app")).toEqual({
      project: "my-app",
      activeView: "portfolio",
    });
  });

  it("reads engine when no project", () => {
    expect(readPortfolioStateFromSearch("?view=engine")).toEqual({
      project: null,
      activeView: "engine",
    });
  });

  it("defaults to portfolio without view param", () => {
    expect(readPortfolioStateFromSearch("?project=foo")).toEqual({
      project: "foo",
      activeView: "portfolio",
    });
  });
});

describe("searchStringForPortfolioState", () => {
  it("does not emit view=engine with an active project", () => {
    expect(
      searchStringForPortfolioState("engine", "my-app", "/")
    ).toBe("/?project=my-app");
  });

  it("emits view=engine only without project", () => {
    expect(searchStringForPortfolioState("engine", null, "/")).toBe("/?view=engine");
  });
});

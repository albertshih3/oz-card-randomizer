import {
  event,
  initGtag,
  pageview,
  PRODUCTION_GA_ID,
  trackingIdFor,
} from "@/lib/gtag";

const PRODUCTION = "ozboosterpacks.albertshih.org";

describe("gtag", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "gtag");
    window.dataLayer = [];
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends local testing to the local stream, never production", () => {
    vi.stubEnv("VITE_GA_ID", "G-LOCALTEST");
    expect(trackingIdFor("localhost")).toBe("G-LOCALTEST");
    expect(trackingIdFor("127.0.0.1")).toBe("G-LOCALTEST");

    initGtag("localhost");
    expect(document.head.querySelector("script")?.src).toContain("G-LOCALTEST");
  });

  it("sends nothing locally if the local ID is the production ID", () => {
    vi.stubEnv("VITE_GA_ID", PRODUCTION_GA_ID);
    expect(trackingIdFor("localhost")).toBe("");
  });

  it("always uses the production stream on the production site", () => {
    vi.stubEnv("VITE_GA_ID", "G-LOCALTEST");
    expect(trackingIdFor(PRODUCTION)).toBe(PRODUCTION_GA_ID);
  });

  it("sends nothing from preview deployments", () => {
    vi.stubEnv("VITE_GA_ID", "G-LOCALTEST");
    initGtag("oz-preview.vercel.app");
    expect(window.gtag).toBeUndefined();
    expect(document.head.querySelector("script")).toBeNull();
    event("generate");
    expect(window.dataLayer).toEqual([]);
  });

  it("loads the tag once, for the dashboard's stream", () => {
    initGtag(PRODUCTION);
    initGtag(PRODUCTION);
    const scripts = document.head.querySelectorAll("script");
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toContain(PRODUCTION_GA_ID);
  });

  it("queues Arguments objects, the only form gtag.js processes", () => {
    initGtag(PRODUCTION);
    expect(Object.prototype.toString.call(window.dataLayer[0])).toBe(
      "[object Arguments]",
    );
  });

  it("turns off automatic pageviews and sends exactly one per call", () => {
    initGtag(PRODUCTION);
    const config = Array.from(window.dataLayer[1]);
    expect(config).toEqual([
      "config",
      PRODUCTION_GA_ID,
      { send_page_view: false },
    ]);

    window.dataLayer.length = 0;
    pageview(new URL("https://example.test/about"));
    expect(window.dataLayer).toHaveLength(1);
    expect(Array.from(window.dataLayer[0]).slice(0, 2)).toEqual([
      "event",
      "page_view",
    ]);
  });
});

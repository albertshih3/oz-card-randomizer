import { event, GA_TRACKING_ID, initGtag, pageview } from "@/lib/gtag";

const PRODUCTION = "ozboosterpacks.albertshih.org";

describe("gtag", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "gtag");
    window.dataLayer = [];
    document.head.innerHTML = "";
  });

  it("stays off outside the production site", () => {
    initGtag("localhost");
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
    expect(scripts[0].src).toContain(GA_TRACKING_ID);
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
      GA_TRACKING_ID,
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

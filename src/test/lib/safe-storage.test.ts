import {
  readPreference,
  resetPreferenceMemory,
  writePreference,
} from "@/lib/safe-storage";

describe("safe-storage", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPreferenceMemory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("round-trips through localStorage when it is available", () => {
    writePreference("key", "value");
    expect(localStorage.getItem("key")).toBe("value");
    expect(readPreference("key")).toBe("value");
  });

  it("keeps the session value when a write is rejected", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    writePreference("key", "value");
    expect(readPreference("key")).toBe("value");
  });

  it("survives a localStorage accessor that throws", () => {
    const spy = vi
      .spyOn(window, "localStorage", "get")
      .mockImplementation(() => {
        throw new DOMException("denied", "SecurityError");
      });
    expect(readPreference("missing")).toBeNull();
    writePreference("key", "value");
    expect(readPreference("key")).toBe("value");
    spy.mockRestore();
  });
});

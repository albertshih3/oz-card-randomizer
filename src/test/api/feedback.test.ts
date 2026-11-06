import type { VercelRequest, VercelResponse } from "@vercel/node";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function () {
    return {
      emails: { send: mockSend },
    };
  }),
}));

const { mockRateLimit } = vi.hoisted(() => ({
  mockRateLimit: vi.fn(async () => true),
}));
vi.mock("../../../api/_rate-limit", () => ({
  enforceRateLimit: mockRateLimit,
}));

import handler from "../../../api/feedback";

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: {
      type: "general",
      message: "The new generator flow feels good.",
      replyTo: "staff@oaklandzoo.org",
    },
    ...overrides,
  } as unknown as VercelRequest;
}

interface MockRes {
  res: VercelResponse;
  getStatusCode: () => number;
  getBody: () => unknown;
}

function makeRes(): MockRes {
  let statusCode = 200;
  let body: unknown = null;
  const res = {
    setHeader: vi.fn(() => res),
    status: vi.fn((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn((data: unknown) => {
      body = data;
      return res;
    }),
    end: vi.fn(() => res),
  } as unknown as VercelResponse;
  return {
    res,
    getStatusCode: () => statusCode,
    getBody: () => body,
  };
}

describe("api/feedback handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    mockSend.mockResolvedValue({});
  });

  afterEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("sends a complete styled HTML email through Resend", async () => {
    const mock = makeRes();

    await handler(makeReq(), mock.res);

    expect(mock.getStatusCode()).toBe(200);
    expect(mock.getBody()).toEqual({ success: true });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "[Feedback] General Feedback — OZ Booster Packs",
        html: expect.stringContaining("<!doctype html>"),
        text: expect.stringContaining("The new generator flow feels good."),
      }),
    );

    const payload = mockSend.mock.calls[0][0] as { html: string };
    expect(payload.html).toContain("<html");
    expect(payload.html).toContain("General Feedback");
    expect(payload.html).toContain("#102f54");
    expect(payload.html).toContain("staff@oaklandzoo.org");
  });

  it.each([
    ["bug", "Bug Report", "#b3261e"],
    ["feature", "Feature Request", "#006d3b"],
    ["other", "Other", "#5d5e61"],
  ])(
    "uses type-specific email styling for %s feedback",
    async (type, label, color) => {
      const mock = makeRes();

      await handler(
        makeReq({
          body: {
            type,
            message: `${label} message for testing.`,
          },
        }),
        mock.res,
      );

      const payload = mockSend.mock.calls[0][0] as {
        html: string;
        subject: string;
      };

      expect(payload.subject).toContain(label);
      expect(payload.html).toContain(label);
      expect(payload.html).toContain(color);
    },
  );

  it("escapes feedback content before inserting it into the HTML email", async () => {
    const mock = makeRes();

    await handler(
      makeReq({
        body: {
          type: "bug",
          message: "<script>alert('oops')</script>",
          replyTo: "staff+test@oaklandzoo.org",
        },
      }),
      mock.res,
    );

    const payload = mockSend.mock.calls[0][0] as { html: string };

    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("<script>");
    expect(payload.html).toContain("mailto:staff+test@oaklandzoo.org");
  });
});

describe("POST /api/feedback hardening", () => {
  const valid = { type: "bug", message: "This is a real report." };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.mockResolvedValue(true);
    mockSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  async function post(overrides: Partial<VercelRequest>) {
    const mock = makeRes();
    await handler(makeReq(overrides), mock.res);
    return mock;
  }

  it.each([
    ["null", null],
    ["an array", [valid]],
    ["a string", "hello"],
  ])("rejects %s body without sending", async (_label, body) => {
    const mock = await post({ body });
    expect(mock.getStatusCode()).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 400 when reading the body throws on malformed JSON", async () => {
    const req = makeReq();
    Object.defineProperty(req, "body", {
      get() {
        throw new Error("Invalid JSON");
      },
    });
    const mock = makeRes();
    await handler(req, mock.res);
    expect(mock.getStatusCode()).toBe(400);
  });

  it("rejects a non-JSON content type", async () => {
    const mock = await post({ headers: { "content-type": "text/plain" } });
    expect(mock.getStatusCode()).toBe(415);
  });

  it("rejects an oversized request", async () => {
    const mock = await post({
      headers: {
        "content-type": "application/json",
        "content-length": "100000",
      },
    });
    expect(mock.getStatusCode()).toBe(413);
  });

  it.each([[42], [{ a: 1 }], [true]])(
    "rejects a non-string reply-to of %j",
    async (replyTo) => {
      const mock = await post({ body: { ...valid, replyTo } });
      expect(mock.getStatusCode()).toBe(400);
      expect(mockSend).not.toHaveBeenCalled();
    },
  );

  it("rejects an overlong reply-to address", async () => {
    const replyTo = `${"a".repeat(260)}@example.org`;
    const mock = await post({ body: { ...valid, replyTo } });
    expect(mock.getStatusCode()).toBe(400);
  });

  it("reports failure when the provider returns an error result", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "bad sender" },
    });
    const mock = await post({ body: valid });
    expect(mock.getStatusCode()).toBe(502);
    expect(JSON.stringify(mock.getBody())).not.toContain("bad sender");
  });

  it("reports failure when the provider throws", async () => {
    mockSend.mockRejectedValue(new Error("timeout"));
    const mock = await post({ body: valid });
    expect(mock.getStatusCode()).toBe(500);
  });

  it("does not send when the limiter refuses", async () => {
    mockRateLimit.mockResolvedValue(false);
    await post({ body: valid });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("drops honeypot submissions silently", async () => {
    const mock = await post({ body: { ...valid, website: "spam.example" } });
    expect(mock.getStatusCode()).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockRateLimit).not.toHaveBeenCalled();
  });

  it("drops instant submissions silently", async () => {
    const mock = await post({ body: { ...valid, elapsedMs: 100 } });
    expect(mock.getStatusCode()).toBe(200);
    expect(mockSend).not.toHaveBeenCalled();
  });
});

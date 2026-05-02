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

import handler from "../../../api/feedback";

function makeReq(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: "POST",
    headers: {},
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

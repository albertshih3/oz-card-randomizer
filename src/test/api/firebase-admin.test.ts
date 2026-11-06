import { createVerify, generateKeyPairSync } from "node:crypto";
import { createCustomToken } from "../../../api/_firebase-admin";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const decode = (part: string) =>
  JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("createCustomToken", () => {
  beforeEach(() => {
    vi.stubEnv(
      "FIREBASE_SERVICE_ACCOUNT_JSON",
      Buffer.from(
        JSON.stringify({
          client_email: "svc@demo.iam.gserviceaccount.com",
          private_key: privateKey,
        }),
      ).toString("base64"),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("produces a Firebase custom token with the uid and claims", () => {
    const [header, payload] = createCustomToken("user_1", {
      approved: true,
    }).split(".");

    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    const body = decode(payload);
    expect(body).toMatchObject({
      iss: "svc@demo.iam.gserviceaccount.com",
      sub: "svc@demo.iam.gserviceaccount.com",
      aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
      uid: "user_1",
      claims: { approved: true },
    });
    expect(body.exp - body.iat).toBe(3600);
  });

  it("signs with the service account key", () => {
    const [header, payload, signature] = createCustomToken("u", {}).split(".");
    const verified = createVerify("RSA-SHA256")
      .update(`${header}.${payload}`)
      .verify(publicKey, Buffer.from(signature, "base64url"));
    expect(verified).toBe(true);
  });

  it("throws without a credential so callers fail closed", () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    expect(() => createCustomToken("u", {})).toThrow("not set");
  });
});

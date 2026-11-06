#!/usr/bin/env node
// Grants or revokes admin approval (Clerk publicMetadata.approved).
//
//   vercel env pull .env.production.local --environment=production
//   node --env-file=.env.production.local scripts/set-user-approval.mjs --list
//   node --env-file=.env.production.local scripts/set-user-approval.mjs --approve user@example.org
//   node --env-file=.env.production.local scripts/set-user-approval.mjs --revoke user@example.org
//
// Approval is per Clerk instance, and .env.local usually holds the development
// one. Changes are previewed unless --apply is passed, and --apply also needs
// --instance=live or --instance=test to match the key in use. Revoked users lose
// API access immediately and Firestore write access when their lease ends (15
// minutes).
import { createClerkClient } from "@clerk/backend";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const mode = ["--list", "--approve", "--revoke"].find((a) => args.includes(a));
const email = args.find((a) => !a.startsWith("--"));

if (!mode || (mode !== "--list" && !email)) {
  console.error(
    "Usage: --list | --approve <email> | --revoke <email> [--apply]",
  );
  process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  console.error("CLERK_SECRET_KEY is not set");
  process.exit(1);
}

const instance = process.env.CLERK_SECRET_KEY.startsWith("sk_live_")
  ? "live"
  : "test";
console.log(`Clerk instance: ${instance.toUpperCase()}`);

if (apply && !args.includes(`--instance=${instance}`)) {
  console.error(
    `Refusing to write: pass --instance=${instance} to confirm this instance.`,
  );
  process.exit(1);
}

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const primaryEmail = (user) =>
  user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
    ?.emailAddress ?? "(no email)";

if (mode === "--list") {
  const limit = 100;
  for (let offset = 0; ; offset += limit) {
    const { data } = await clerk.users.getUserList({ limit, offset });
    for (const user of data) {
      const approved = user.publicMetadata?.approved === true;
      console.log(
        `${approved ? "approved  " : "unapproved"}  ${primaryEmail(user)}`,
      );
    }
    if (data.length < limit) break;
  }
  process.exit(0);
}

const { data: matches } = await clerk.users.getUserList({
  emailAddress: [email],
});
if (matches.length !== 1) {
  console.error(`Expected one user for ${email}, found ${matches.length}`);
  process.exit(1);
}

const [user] = matches;
const approved = mode === "--approve";
if (!apply) {
  console.log(
    `Would set approved=${approved} on ${primaryEmail(user)}. Re-run with --apply.`,
  );
  process.exit(0);
}
await clerk.users.updateUserMetadata(user.id, {
  publicMetadata: { approved },
});
console.log(`Set approved=${approved} on ${primaryEmail(user)}`);

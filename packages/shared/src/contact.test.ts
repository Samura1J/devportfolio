import { describe, expect, it } from "vitest";
import { ContactRequestSchema } from "./contact";

const valid = {
  name: "Jane Doe",
  email: "jane@example.com",
  inquiryType: "contract",
  message: "We need a React developer for a three-month build.",
};

describe("ContactRequestSchema", () => {
  it("accepts a complete request and trims text", () => {
    const parsed = ContactRequestSchema.parse({ ...valid, name: "  Jane Doe  " });
    expect(parsed.name).toBe("Jane Doe");
  });

  it.each([
    ["name", { name: "   " }],
    ["email", { email: "not-an-email" }],
    ["inquiryType", { inquiryType: "spam" }],
    ["message", { message: "too short" }],
  ])("rejects a bad %s", (field, patch) => {
    const result = ContactRequestSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it("lets a filled honeypot through so the API can drop it silently", () => {
    expect(ContactRequestSchema.safeParse({ ...valid, website: "http://spam" }).success).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { validateLeadInput } from "@/lib/validation";

const validInput = {
  fullName: "Jane Doe",
  phone: "555-123-4567",
  email: "jane@example.com",
  zip: "94103",
  ageBracket: "65-70",
  currentCoverage: "None",
  preferredContactTime: "Morning",
  notes: "",
  honeypot: "",
};

describe("validateLeadInput", () => {
  it("accepts fully valid input", () => {
    const result = validateLeadInput(validInput);
    expect(result.valid).toBe(true);
  });

  it("rejects missing full name", () => {
    const result = validateLeadInput({ ...validInput, fullName: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toBeDefined();
  });

  it("rejects missing phone", () => {
    const result = validateLeadInput({ ...validInput, phone: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it("rejects malformed phone", () => {
    const result = validateLeadInput({ ...validInput, phone: "not-a-phone" });
    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeDefined();
  });

  it("rejects missing zip", () => {
    const result = validateLeadInput({ ...validInput, zip: "" });
    expect(result.valid).toBe(false);
    expect(result.errors.zip).toBeDefined();
  });

  it("rejects malformed zip", () => {
    const result = validateLeadInput({ ...validInput, zip: "abcde" });
    expect(result.valid).toBe(false);
    expect(result.errors.zip).toBeDefined();
  });

  it("rejects malformed email when provided", () => {
    const result = validateLeadInput({ ...validInput, email: "not-an-email" });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("accepts a missing email since it is optional", () => {
    const result = validateLeadInput({ ...validInput, email: "" });
    expect(result.valid).toBe(true);
  });

  it("rejects submissions where the honeypot field is filled in", () => {
    const result = validateLeadInput({ ...validInput, honeypot: "i-am-a-bot" });
    expect(result.valid).toBe(false);
    expect(result.errors.honeypot).toBeDefined();
  });

  it("rejects a full name longer than 100 characters", () => {
    const result = validateLeadInput({ ...validInput, fullName: "a".repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors.fullName).toBeDefined();
  });

  it("rejects notes longer than 2000 characters", () => {
    const result = validateLeadInput({ ...validInput, notes: "a".repeat(2001) });
    expect(result.valid).toBe(false);
    expect(result.errors.notes).toBeDefined();
  });

  it("rejects an email longer than 254 characters", () => {
    const longEmail = `${"a".repeat(250)}@x.com`;
    const result = validateLeadInput({ ...validInput, email: longEmail });
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it("rejects overlong ageBracket, currentCoverage, and preferredContactTime", () => {
    const long = "a".repeat(101);
    const result = validateLeadInput({
      ...validInput,
      ageBracket: long,
      currentCoverage: long,
      preferredContactTime: long,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.ageBracket).toBeDefined();
    expect(result.errors.currentCoverage).toBeDefined();
    expect(result.errors.preferredContactTime).toBeDefined();
  });

  it("accepts fields at exactly their maximum lengths", () => {
    const result = validateLeadInput({
      ...validInput,
      fullName: "a".repeat(100),
      notes: "a".repeat(2000),
    });
    expect(result.valid).toBe(true);
  });
});

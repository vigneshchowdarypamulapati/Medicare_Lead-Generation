export type LeadInput = {
  fullName: string;
  phone: string;
  email: string;
  zip: string;
  ageBracket: string;
  currentCoverage: string;
  preferredContactTime: string;
  notes: string;
  honeypot: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof LeadInput, string>>;
};

const PHONE_RE = /^[0-9()+\-.\s]{7,20}$/;
const ZIP_RE = /^\d{5}(-\d{4})?$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLeadInput(input: LeadInput): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (input.honeypot && input.honeypot.trim() !== "") {
    errors.honeypot = "Spam detected";
  }
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = "Full name is required";
  }
  if (!input.phone || !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "A valid phone number is required";
  }
  if (!input.zip || !ZIP_RE.test(input.zip.trim())) {
    errors.zip = "A valid 5-digit ZIP code is required";
  }
  if (input.email && input.email.trim() !== "" && !EMAIL_RE.test(input.email.trim())) {
    errors.email = "Email address is not valid";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

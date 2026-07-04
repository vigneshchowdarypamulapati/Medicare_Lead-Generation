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

const MAX_FULL_NAME = 100;
const MAX_EMAIL = 254;
const MAX_NOTES = 2000;
const MAX_SHORT_FIELD = 100; // ageBracket, currentCoverage, preferredContactTime

export function validateLeadInput(input: LeadInput): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (input.honeypot && input.honeypot.trim() !== "") {
    errors.honeypot = "Spam detected";
  }
  if (!input.fullName || input.fullName.trim().length < 2) {
    errors.fullName = "Full name is required";
  } else if (input.fullName.trim().length > MAX_FULL_NAME) {
    errors.fullName = `Full name must be ${MAX_FULL_NAME} characters or fewer`;
  }
  if (!input.phone || !PHONE_RE.test(input.phone.trim())) {
    errors.phone = "A valid phone number is required";
  }
  if (!input.zip || !ZIP_RE.test(input.zip.trim())) {
    errors.zip = "A valid 5-digit ZIP code is required";
  }
  if (input.email && input.email.trim() !== "") {
    if (input.email.trim().length > MAX_EMAIL) {
      errors.email = `Email must be ${MAX_EMAIL} characters or fewer`;
    } else if (!EMAIL_RE.test(input.email.trim())) {
      errors.email = "Email address is not valid";
    }
  }
  if (input.notes && input.notes.trim().length > MAX_NOTES) {
    errors.notes = `Notes must be ${MAX_NOTES} characters or fewer`;
  }
  if (input.ageBracket && input.ageBracket.trim().length > MAX_SHORT_FIELD) {
    errors.ageBracket = `Age bracket must be ${MAX_SHORT_FIELD} characters or fewer`;
  }
  if (input.currentCoverage && input.currentCoverage.trim().length > MAX_SHORT_FIELD) {
    errors.currentCoverage = `Current coverage must be ${MAX_SHORT_FIELD} characters or fewer`;
  }
  if (input.preferredContactTime && input.preferredContactTime.trim().length > MAX_SHORT_FIELD) {
    errors.preferredContactTime = `Preferred contact time must be ${MAX_SHORT_FIELD} characters or fewer`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

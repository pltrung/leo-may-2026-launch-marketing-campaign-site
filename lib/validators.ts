import { z } from "zod";

/** Preprocess: empty string → undefined so optional() works correctly */
const emptyToUndefined = (val: unknown) =>
  val === "" || val === undefined ? undefined : val;

export const waitlistSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100).trim(),
    email: z.preprocess(
      emptyToUndefined,
      z.string().email("Invalid email").max(255).optional()
    ),
    phone: z.preprocess(
      emptyToUndefined,
      z.string().max(20).regex(/^[\d\s\-\+\(\)]*$/, "Invalid phone").optional()
    ),
    cloud_type: z.string().min(1, "Cloud type required").trim(),
  })
  .refine(
    (data) => {
      const hasEmail = data.email && String(data.email).trim().length > 0;
      const hasPhone = data.phone && String(data.phone).trim().length > 0;
      return hasEmail || hasPhone;
    },
    { message: "Email or phone is required", path: ["email"] }
  );

export type WaitlistInput = z.infer<typeof waitlistSchema>;

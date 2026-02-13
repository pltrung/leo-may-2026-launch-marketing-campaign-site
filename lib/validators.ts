import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  v === "" || v === undefined ? undefined : v;

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
    (d) => {
      const e = d.email && String(d.email).trim().length > 0;
      const p = d.phone && String(d.phone).trim().length > 0;
      return e || p;
    },
    { message: "Email or phone is required", path: ["email"] }
  );

export type WaitlistInput = z.infer<typeof waitlistSchema>;

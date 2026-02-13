import { z } from "zod";

export const waitlistSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .max(20)
    .regex(/^[\d\s\-\+\(\)]*$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  cloud_type: z.string().min(1, "Please select a cloud personality").trim(),
}).refine(
  (data) => {
    const hasEmail = data.email && data.email.length > 0;
    const hasPhone = data.phone && data.phone.length > 0;
    return hasEmail || hasPhone;
  },
  { message: "Email or phone is required", path: ["email"] }
);

export type WaitlistInput = z.infer<typeof waitlistSchema>;

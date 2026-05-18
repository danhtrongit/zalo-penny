import { z } from "zod";

const personaStyle = z.enum([
  "FRIEND",
  "ASSISTANT",
  "HOMEMAKER",
  "COACH",
  "COMEDIAN",
]);

const personaIntensity = z.number().int().min(1).max(5);

export const updatePersonaBody = z.object({
  style: personaStyle.optional(),
  tease: personaIntensity.optional(),
  serious: personaIntensity.optional(),
  frugal: personaIntensity.optional(),
  emoji: personaIntensity.optional(),
  // Empty string is allowed and means "no display name set" — UI ships
  // `displayName: ""` by default until the user types one.
  displayName: z.string().max(60).optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
});

export type UpdatePersonaInput = z.infer<typeof updatePersonaBody>;

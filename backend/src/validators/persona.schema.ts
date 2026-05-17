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
  displayName: z.string().min(1).max(60).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
});

export type UpdatePersonaInput = z.infer<typeof updatePersonaBody>;

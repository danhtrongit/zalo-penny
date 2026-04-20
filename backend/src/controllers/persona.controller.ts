import { Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

export const getPersona = async (req: AuthRequest, res: Response) => {
  const persona = await prisma.persona.findUnique({
    where: { userId: req.userId! },
  });

  res.json(
    persona || {
      style: "FRIEND",
      tease: 3,
      serious: 3,
      frugal: 3,
      emoji: 3,
      displayName: null,
      gender: null,
    }
  );
};

export const updatePersona = async (req: AuthRequest, res: Response) => {
  const { style, tease, serious, frugal, emoji, displayName, gender } = req.body;

  const persona = await prisma.persona.upsert({
    where: { userId: req.userId! },
    update: {
      ...(style !== undefined && { style }),
      ...(tease !== undefined && { tease }),
      ...(serious !== undefined && { serious }),
      ...(frugal !== undefined && { frugal }),
      ...(emoji !== undefined && { emoji }),
      ...(displayName !== undefined && { displayName }),
      ...(gender !== undefined && { gender }),
    },
    create: {
      userId: req.userId!,
      style: style || "FRIEND",
      tease: tease ?? 3,
      serious: serious ?? 3,
      frugal: frugal ?? 3,
      emoji: emoji ?? 3,
      displayName,
      gender,
    },
  });

  res.json(persona);
};

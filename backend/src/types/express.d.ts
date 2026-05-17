declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      id?: string;
    }
  }
}

export {};

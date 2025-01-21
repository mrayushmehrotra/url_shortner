import { v4 as uuidv4 } from "uuid";

const generateShortUrl = (): string => {
  const uuid = uuidv4();
  // Take the first 7 characters of the UUID and remove hyphens
  const shortUrl = uuid.replace(/-/g, "").slice(0, 7);
  return shortUrl;
};

export { generateShortUrl };

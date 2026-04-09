import type { CollectionCreateSchema } from "typesense";

export const USER_COLLECTION_NAME = "users";

export const userCollectionSchema: CollectionCreateSchema = {
  name: USER_COLLECTION_NAME,
  fields: [
    { name: "id", type: "string" },
    { name: "name", type: "string", optional: true },
    { name: "email", type: "string" },
    { name: "role", type: "string", optional: true },
    { name: "emailVerified", type: "bool" },
    { name: "banned", type: "bool", optional: true },
    { name: "createdAt", type: "int64" },
  ],
  default_sorting_field: "createdAt",
};

export interface UserDocument {
  id: string;
  name?: string;
  email: string;
  role?: string;
  emailVerified: boolean;
  banned?: boolean;
  createdAt: number; // Unix timestamp in seconds
}

export function mapUserToDocument(user: {
  id: string;
  name?: string | null;
  email: string;
  role?: string | null;
  emailVerified?: boolean;
  banned?: boolean | null;
  createdAt?: Date | string | null;
}): UserDocument {
  const createdAt =
    user.createdAt instanceof Date
      ? Math.floor(user.createdAt.getTime() / 1000)
      : user.createdAt
        ? Math.floor(new Date(user.createdAt).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

  return {
    id: user.id,
    ...(user.name != null && { name: user.name }),
    email: user.email,
    ...(user.role != null && { role: user.role }),
    emailVerified: user.emailVerified ?? false,
    ...(user.banned != null && { banned: user.banned }),
    createdAt,
  };
}

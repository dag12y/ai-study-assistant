import { and, eq } from "drizzle-orm";

import { db } from "../../database/client.js";
import { workspaces } from "../../database/schema.js";
import { AppError } from "../../lib/errors.js";

import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from "./workspace.schemas.js";

export const createWorkspace = async (
  userId: string,
  input: CreateWorkspaceInput,
) => {
  const [workspace] = await db
    .insert(workspaces)
    .values({
      ownerId: userId,
      name: input.name,
      description: input.description,
    })
    .returning();

  if (!workspace) {
    throw new AppError(
      "Failed to create workspace.",
      500,
      "WORKSPACE_CREATION_FAILED",
    );
  }

  return workspace;
};

export const listWorkspaces = async (userId: string) => {
  return db.query.workspaces.findMany({
    where: eq(workspaces.ownerId, userId),
    orderBy: (workspaces, { desc }) => [desc(workspaces.createdAt)],
  });
};

export const getWorkspace = async (userId: string, workspaceId: string) => {
  const workspace = await db.query.workspaces.findFirst({
    where: and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)),
  });

  if (!workspace) {
    throw new AppError("Workspace not found.", 404, "WORKSPACE_NOT_FOUND");
  }

  return workspace;
};

export const updateWorkspace = async (
  userId: string,
  workspaceId: string,
  input: UpdateWorkspaceInput,
) => {
  // Make sure the workspace belongs to the current user.
  await getWorkspace(userId, workspaceId);

  const [workspace] = await db
    .update(workspaces)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
    .returning();

  if (!workspace) {
    throw new AppError(
      "Failed to update workspace.",
      500,
      "WORKSPACE_UPDATE_FAILED",
    );
  }

  return workspace;
};

export const deleteWorkspace = async (
  userId: string,
  workspaceId: string,
): Promise<void> => {
  await getWorkspace(userId, workspaceId);

  const result = await db
    .delete(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, userId)))
    .returning({
      id: workspaces.id,
    });

  if (result.length === 0) {
    throw new AppError("Workspace not found.", 404, "WORKSPACE_NOT_FOUND");
  }
};

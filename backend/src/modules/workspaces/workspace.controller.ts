import type { RequestHandler } from "express";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  workspaceIdSchema,
} from "./workspace.schemas.js";

import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "./workspace.service.js";

export const create: RequestHandler = async (req, res, next) => {
  try {
    const input = createWorkspaceSchema.parse(req.body);

    const workspace = await createWorkspace(req.user!.id, input);

    res.status(201).json({
      success: true,
      data: workspace,
      message: "Workspace created successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const workspaces = await listWorkspaces(req.user!.id);

    res.status(200).json({
      success: true,
      data: workspaces,
      message: "Workspaces retrieved successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const get: RequestHandler = async (req, res, next) => {
  try {
    const { workspaceId } = workspaceIdSchema.parse(req.params);
    const workspace = await getWorkspace(req.user!.id, workspaceId);

    res.status(200).json({
      success: true,
      data: workspace,
      message: "Workspace retrieved successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    const input = updateWorkspaceSchema.parse(req.body);
    const { workspaceId } = workspaceIdSchema.parse(req.params);

    const workspace = await updateWorkspace(
      req.user!.id,
      workspaceId,
      input,
    );

    res.status(200).json({
      success: true,
      data: workspace,
      message: "Workspace updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const { workspaceId } = workspaceIdSchema.parse(req.params);
    await deleteWorkspace(req.user!.id, workspaceId);

    res.status(200).json({
      success: true,
      data: null,
      message: "Workspace deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


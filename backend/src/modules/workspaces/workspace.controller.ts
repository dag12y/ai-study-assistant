import type { RequestHandler } from "express";

import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
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
    const workspace = await getWorkspace(req.user!.id, req.params.workspaceId as string);

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

    const workspace = await updateWorkspace(
      req.user!.id,
      req.params.workspaceId as string,
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
    await deleteWorkspace(req.user!.id, req.params.workspaceId as string);

    res.status(200).json({
      success: true,
      data: null,
      message: "Workspace deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};


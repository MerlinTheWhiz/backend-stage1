import { Request, Response, NextFunction } from "express";
import * as service from "./profile.service";
import { CreateProfileInput } from "./profile.types";

export const createProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name } = req.body as CreateProfileInput;

    const result = await service.createProfile(name);

    if (result.exists) {
      return res.status(200).json({
        status: "success",
        message: "Profile already exists",
        data: result.data,
      });
    }

    return res.status(201).json({
      status: "success",
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfiles = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await service.getProfiles(req.query);
    res.json({
      status: "success",
      count: data.length,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfileById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format",
      });
    }

    const data = await service.getProfileById(id);

    if (!data) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found",
      });
    }

    res.json({ status: "success", data });
  } catch (err) {
    next(err);
  }
};


export const deleteProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid ID format",
      });
    }

    await service.deleteProfile(id);

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};
import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, validationResult, query } from "express-validator/lib/index.js";
import UserModel from "../../../../../models/users.js";
import { PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import bcrypt from "bcrypt";

const profileValidator = {
  userDetails: async (req, res, next) => {
    await global.validateObjId(req, "_id", {
      findInDb: true,
      DBField: "_id",
      DB: UserModel,
      query: true,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  createPortfolioService: async (req, res, next) => {
    await global.validateTextField(
      req,
      "title",
      {},
      {
        required: "Title is required",
      }
    );

    await global.validateNumberField(
      req,
      "duration",
      {},
      {
        required: "Duration is required",
      }
    );

    await global.validateNumberField(
      req,
      "flat_price",
      {},
      {
        required: "Flat price is required",
      }
    );

    await global.validateNumberField(
      req,
      "hourly_price",
      {},
      {
        required: "Hourly price is required",
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  editPortfolioService: async (req, res, next) => {
    await body("service_id")
      .notEmpty()
      .withMessage("Service ID is required")
      .isMongoId()
      .withMessage("Invalid service ID")
      .run(req);

    await global.validateTextField(
      req,
      "title",
      {},
      {
        required: "Title cannot be empty",
      }
    );

    await global.validateNumberField(
      req,
      "duration",
      {},
      {
        required: "Duration is required",
      }
    );

    await global.validateNumberField(
      req,
      "flat_price",
      {},
      {
        required: "Flat price is required",
      }
    );

    await global.validateNumberField(
      req,
      "hourly_price",
      {},
      {
        required: "Hourly price is required",
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  deletePortfolioService: async (req, res, next) => {
    await body("service_id")
      .notEmpty()
      .withMessage("Service ID is required")
      .isMongoId()
      .withMessage("Invalid service ID")
      .run(req);

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  getPortfolioServiceById: async (req, res, next) => {
    await global.validateObjId(req, "service_id", {
      findInDb: false,
      query: true,
    });
    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  saveBasicProfile: async (req, res, next) => {
    await global.validateTextField(
      req,
      "business_name",
      {},
      {
        required: "Business name is required",
      },
      "email",
      {},
      {
        required: "Email is required",
      },
      "phone_number",
      {},
      {
        required: "Phone number is required",
      },
      "countryCode",
      {},
      {
        required: "Country code is required",
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  createPortfolio: async (req, res, next) => {
    await global.validateTextField(
      req,
      "title",
      {},
      {
        required: "Title is required",
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default profileValidator
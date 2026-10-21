import global from "./../../../../../helpers/global-functions.js";
import { body, validationResult, query } from "express-validator/lib/index.js";
import bcrypt from "bcrypt";
import UserModel from "../../../../../models/users.js";
import { PASSWORD_MIN_LENGTH, MESSAGE } from "../../../../../global-variable.js";

const authValidator = {
  login: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, "admin_err_email_is_required"),
      }
    );
    await body("password").not().isEmpty().withMessage(global.msg(req, res, "admin_err_password_is_required"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  } /** Ends login */,

  forgetPassword: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, global.msg(req, res, "admin_err_email_is_required")),
      }
    );

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, gloMESSAGE.INVALID_REQUEST, errors);
    }
  },
  verifyOtp: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, "admin_err_email_is_required"),
      }
    );
    await global.validateTextField(req, "otp", global.msg(req, res, "admin_err_otp_is_required"));
    await global.validateTextField(req, "type", global.msg(req, res, "admin_err_type_is_required"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  } /** Ends verifyOtp */,

  resendOtp: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, "admin_err_email_is_required"),
      }
    );
    await global.validateTextField(req, "type", global.msg(req, res, "admin_err_type_is_required"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global, msg(req, res, MESSAGE.INVALID_REQUEST), errors);
    }
  } /** Ends resendOtp */,

  invitationInfo: async (req, res, next) => {
    await global.validateTextField(req, "validate_string", global.msg(req, res, "admin_err_validate_string_is_required"));

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  } /** Ends resendOtp */,

  completeInvitation: async (req, res, next) => {
    await global.validateTextField(req, "validate_string", global.msg(req, res, "admin_err_validate_string_is_required"));
    await global.validateTextField(req, "password", global.msg(req, res, "admin_err_password_is_required"));
    await global.validateTextField(req, "c_password", global.msg(req, res, "admin_err_c_password_is_required"));
    await body("c_password")
      .custom((value) => {
        return req.body.password == value;
      })
      .withMessage("Confirm password have to be same as password")
      .run(req);
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global.msg(req, res, MESSAGE.INVALID_REQUEST), errors);
    }
  } /** Ends resendOtp */,

  resetPassword: async (req, res, next) => {
    await body("validate_string").exists({ checkNull: true, checkFalsy: true }).withMessage(global.msg(req, res, "admin_err_validate_string_is_required")).trim().not().isEmpty().withMessage(global.msg(req, res, "admin_err_validate_string_is_required")).run(req);

    await body("new_password")
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage(global.msg(req, res, "admin_err_new_password_is_required"))
      .isLength({ min: PASSWORD_MIN_LENGTH })
      .withMessage(global.msg(req, res, "err_min_length_password").replace("{PASSWORD_MIN_LENGTH}", PASSWORD_MIN_LENGTH))
      .matches(/[A-Z]/)
      .withMessage(global.msg(req, res, "err_capital_letter_in_password"))
      .matches(/\d/)
      .withMessage(global.msg(req, res, "err_one_number_in_password"))
      .matches(/[@$!%*?&]/)
      .withMessage(global.msg(req, res, "err_one_special_char_in_password"))
      .custom(async (value, { req }) => {
        const user = await UserModel.findOne({ validate_string: req.body.validate_string });
        if (user) {
          const isSameAsOldPassword = await bcrypt.compare(value, user.password);
          if (isSameAsOldPassword) {
            throw new Error(global.msg(req, res, "err_password_cannot_be_same_as_old"));
          }
        } else {
          throw new Error(global.msg(req, res, "admin_err_validate_string_is_required"));
        }
      })
      .run(req);
    await body("c_password")
      .not()
      .isEmpty()
      .withMessage(global.msg(req, res, "admin_err_c_password_is_required"))
      .custom((value) => {
        return req.body.new_password === req.body.c_password;
      })
      .withMessage(global.msg(req, res, "admin_err_c_new_is_required"))
      .run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global.msg(req, res, MESSAGE.INVALID_REQUEST), errors);
    }
  } /** Ends resetPassword */,
};

export default authValidator;

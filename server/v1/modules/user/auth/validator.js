import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, validationResult, query } from "express-validator/lib/index.js";
import UserModel from "../../../../../models/users.js";
import { PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import bcrypt from "bcrypt";




const authValidator = {
  signUpWithEmail: async (req, res, next) => {

    await body("email")
      .notEmpty()
      .withMessage(global.msg(req, res, "user_err_email_is_required"))
      .isEmail()
      .withMessage(global.msg(req, res, "user_err_invalid_email"))
      .run(req);

    await body("password")
      .notEmpty()
      .withMessage(global.msg(req, res, "user_err_password_is_required"))
      .run(req);

    await body("privacy_accepted")
      .equals("true")
      .withMessage("Privacy Policy must be accepted")
      .run(req);

    await body("terms_accepted")
      .equals("true")
      .withMessage("Terms of Service must be accepted")
      .run(req);

    // await body("fcm_token")
    //   .equals("true")
    //   .withMessage("FCM token is required")
    //   .run(req);

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  login: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, "user_err_email_is_required"),
      }
    );
    await body("password").not().isEmpty().withMessage(global.msg(req, res, "user_err_password_is_required"));

    // await body("fcm_token")
    //   .equals("true")
    //   .withMessage("FCM token is required")
    //   .run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponseValidator(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
  forgetPassword: async (req, res, next) => {
    await global.validateEmailField(req, "email", {});

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global.msg(req, res, "msg_invalid_request"), errors);
    }
  },

  resendOtp: async (req, res, next) => {
    await global.validateEmailField(req, "email", {});
    await global.validateTextField(req, "type");

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global.msg(req, res, "msg_invalid_request"), errors);
    }
  },

  resetPassword: async (req, res, next) => {
    await global.validateTextField(req, "validate_string");
    await global.validatePasswordField(
      req,
      "new_password",
      {
        required: true,
        findInDb: true,
        DBField: "password",
        DB: UserModel,
        findJson: {
          validate_string: req.body.validate_string,
        },
      },
      {
        required: global.msg(req, res, "admin_err_new_password_is_required"),
        capital_letter: global.msg(req, res, "err_capital_letter_in_password"),
        number: global.msg(req, res, "err_one_number_in_password"),
        special_character: global.msg(req, res, "err_one_special_char_in_password"),
        min_length: global.msg(req, res, "err_min_length_password", [PASSWORD_MIN_LENGTH]),
        same_as_old: global.msg(req, res, "err_password_cannot_be_same_as_old"),
      }
    );
    await global.validateTextField(req, "c_password");
    await body("c_password")
      .custom((value) => {
        return req.body.new_password == value;
      })
      .withMessage(global.msg(req, res, "err_password_do_not_match"))
      .run(req);

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, global.msg(req, res, "msg_invalid_request"), errors);
    }
  },
  verifyOtpWithEmail: async (req, res, next) => {
    await global.validateEmailField(
      req,
      "email",
      {},
      {
        required: global.msg(req, res, "user_err_email_is_required"),
      },
      "otp",
      {},
      {
        required: global.msg(req, res, "user_err_OTP_is_required"),
      },
      "type",
      {},
      {
        required: global.msg(req, res, "user_err_type_is_required"),
      }
    );
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  googleLogin: async (req, res, next) => {
    await global.validateTextField(
      req,
      "id_token",
      {},
      {
        required: global.msg(req, res, "user_err_id_token_is_requires"),
      }
    );
    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  appleLogin: async (req, res, next) => {
    const token = req.body.id_token || req.body.identityToken;
    if (!token || (typeof token === "string" && !token.trim())) {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, [
        { msg: global.msg(req, res, "user_err_identification_token_is_requires") },
      ]);
    }
    req.body.id_token = typeof token === "string" ? token.trim() : token;
    next();
  },

  editProfile: async (req, res, next) => {
    await global.validateTextField(
      req,
      "first_name",
      {},
      {
        required: global.msg(req, res, "user_err_first_name_is_required"),
      },

      "last_name",
      {},
      {
        required: global.msg(req, res, "user_err_last_name_is_required"),
      },

      "full_name",
      {},
      {
        required: global.msg(req, res, "user_err_full_name_is_requires"),
      },

      "username",
      {},
      {
        required: global.msg(req, res, "user_err_username_is_requires"),
      },

      // "DOB",
      // {},
      // {
      //   required: global.msg(req, res, "ser_err_DOB_is_requires"),
      // },

      "address",
      {},
      {
        required: global.msg(req, res, "user_err_address_is_required"),
      },

      "gender",
      {},
      {
        required: global.msg(req, res, "user_err_gender_is_requires"),
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    }
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },
  saveProfile: async (req, res, next) => {
    await global.validateTextField(
      req,
      "first_name",
      {},
      {
        required: global.msg(req, res, "user_err_first_name_is_required"),
      },

      "last_name",
      {},
      {
        required: global.msg(req, res, "user_err_last_name_is_required"),
      },

      "full_name",
      {},
      {
        required: global.msg(req, res, "user_err_full_name_is_required"),
      },

      "username",
      {},
      {
        required: global.msg(req, res, "user_err_username_is_required"),
      },

      // "DOB",
      // {},
      // {
      //   required: global.msg(req, res, "user_err_DOB_is_required"),
      // },

      "address",
      {},
      {
        required: global.msg(req, res, "user_err_address_is_required"),
      },

      "gender",
      {},
      {
        required: global.msg(req, res, "user_err_gender_is_required"),
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    }
    return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
  },

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
};

export default authValidator
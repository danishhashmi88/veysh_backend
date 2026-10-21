import global from "../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";


const gsValidator = {
  /**This function is used to validate global-settings api */
  save: async (req, res, next) => {
    // await global.validateTextField(req,'title');
    await global.validateEmailField(
      req,
      "admin_email",
      {},
      {
        required: "admin_err_email_is_required",
      }
    );
    await global.validateMobileNumberField(req, "phone_number", {
      required: "admin_err_phone_no_is_required",
    });
    await global.validateTextField(req, "address", "admin_err_address_is_required");
    await global.validateTextField(req, "copy_right_text", "admin_err_copy_right_text_is_required");
    await global.validateTextField(req, "play_store_url", "admin_err_play_store_url_is_required");
    await global.validateTextField(req, "app_store_url", "admin_err_app_store_url_is_required");

    let errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length == 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default gsValidator;

const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";
import { body, validationResult } from "express-validator";

import mongoose from "mongoose";
import { MESSAGE } from "../../../../../global-variable.js";
import Modal from "../../../../../models/category.js";

const categoryValidator = {
  /**This function is used to validate save api */
//   save: async (req, res, next) => {
//     await global.validateTextField(req, "title", "admin_err_title_is_required");
// 
//     await global.validateTextField(req, "description", global.msg(req, res, "admin_err_description_is_required"));
//     let errors = validationResult(req).array({ onlyFirstError: true });
// 
//     if (errors.length == 0) {
//       next();
//     } else {
//       return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
//     }
//   },


};

export default categoryValidator;

import global from "../../../../../helpers/global-functions.js";
import { validationResult } from "express-validator";
import { MESSAGE } from "../../../../../global-variable.js";
import IapTransaction from "../../../../../models/iap-transaction.js";

const IapTransactionValidator = {
  /**
   * Validate details API — o_id must be a valid ObjectId and must exist in DB
   */
  details: async (req, res, next) => {
    await global.validateObjId(
      req,
      "o_id",
      {
        findInDb: true,
        DBField: "_id",
        DB: IapTransaction,
        query: true,
      },
      {
        required: "admin_err_o_id_is_required",
      }
    );

    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length === 0) {
      next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default IapTransactionValidator;

import global from "../../../../../helpers/global-functions.js";
import { query, validationResult } from "express-validator";
import { MESSAGE } from "../../../../../global-variable.js";
import UserSubscription from "../../../../../models/user-subscription.js";

const UserSubscriptionValidator = {
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
        DB: UserSubscription,
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

export default UserSubscriptionValidator;

import global from "../../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../../global-variable.js";
import { body, validationResult, query } from "express-validator/lib/index.js";

const myLookbookValidator = {
  addLookbook: async (req, res, next) => {
    await body("type")
      .notEmpty()
      .withMessage("Type is required")
      .isIn(["post", "outfit", "website"])
      .withMessage("Type must be 'post', 'outfit', or 'website'")
      .run(req);

    await body("post_id")
      .if(body("type").equals("post"))
      .notEmpty()
      .withMessage("Post ID is required when type is 'post'")
      .isMongoId()
      .withMessage("Invalid post ID")
      .run(req);

    await body("outfit_id")
      .if(body("type").equals("outfit"))
      .notEmpty()
      .withMessage("Outfit ID is required when type is 'outfit'")
      .isMongoId()
      .withMessage("Invalid outfit ID")
      .run(req);

    await body("title")
      .if(body("type").equals("website"))
      .notEmpty()
      .withMessage("Title is required when type is 'website'")
      .trim()
      .run(req);

    await body("website_link")
      .if(body("type").equals("website"))
      .notEmpty()
      .withMessage("Website link is required when type is 'website'")
      .isURL()
      .withMessage("Website link must be a valid URL")
      .run(req);

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },

  deleteLookbookItem: async (req, res, next) => {
    await body("lookbook_id")
      .notEmpty()
      .withMessage("Lookbook ID is required")
      .isMongoId()
      .withMessage("Invalid lookbook ID")
      .run(req);

    const errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length === 0) {
      return next();
    } else {
      return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
  },
};

export default myLookbookValidator;

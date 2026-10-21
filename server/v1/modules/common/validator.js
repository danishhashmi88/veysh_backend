import global from "../../../../helpers/global-functions.js";
import { MESSAGE } from "../../../../global-variable.js";
import {  validationResult } from "express-validator/lib/index.js";




const routeValidator = {

contactUs: async (req, res, next) => {

    await global.validateTextField(req, "name", global.msg(req, res, "Name is required"));

    await global.validateEmailField(req, "email", global.msg(req, res, "Email is required"));

    await global.validateTextField(req, "subject", global.msg(req, res, "Subject is required"));

    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
        next();
    } else {
        return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
},
};

export default routeValidator
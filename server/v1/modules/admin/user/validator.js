import global from "./../../../../../helpers/global-functions.js";
import { body, query, param, validationResult } from "express-validator";

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../../../../../models/users.js";
const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE, PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";


const userValidator = {
    save: async (req, res, next) => {
        await global.validateEmailField(
            req,
            "email",
            { required: true, findInDb: true, DBField: "email", DB: User },
            {}
        );
        await global.validateTextField(
            req,
            "restaurant_name",
            { required: true, DBField: "restaurant_name", DB: User },
            {}
        );
        await global.validateTextField(
            req,
            "phone_number",
            { required: true, DBField: "phone_number", DB: User },
            {}
        );
        await global.validateTextField(
            req,
            "address",
            { required: true, DBField: "address", DB: User },
            {}
        );
        await global.validateTextField(
            req,
            "cuisine_type",
            { required: true, DBField: "cuisine_type", DB: User },
            {}
        );
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    editUser: async (req, res, next) => {
        await global.validateObjId(req, "o_id");
        await global.validateEmailField(
            req,
            "email",
            {
                required: true,
                findInDb: true,
                DBField: "email",
                DB: User,
                findJson: { _id: { $ne: new ObjectId(req.body.o_id) } },
            },
            {}
        );
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    editProfile: async (req, res, next) => {
        const { _id } = req.user;
        await global.validateEmailField(
            req,
            "email",
            {
                required: true,
                findInDb: true,
                DBField: "email",
                DB: User,
                findJson: { _id: { $ne: new ObjectId(_id) } },
            },
            {}
        );

        await body("first_name").trim().not().isEmpty().withMessage(global.msgByReq(req, "admin_err_first_name_is_required"))
            .isLength({ max: 15 })
            .withMessage(global.msgByReq(req, "max_length_error")).run(req);

        await body("middle_name").trim().optional().isLength({ max: 15 })
            .withMessage(global.msgByReq(req, "max_length_error")).run(req);

        await body("last_name").trim().not().isEmpty().withMessage(global.msgByReq(req, "admin_err_last_name_is_required"))
            .isLength({ max: 15 })
            .withMessage(global.msgByReq(req, "max_length_error")).run(req);

        await global.validateMobileNumberField(req, "phone_number", {
            required: "admin_err_phone_no_is_required",
        })
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            return next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    } /** Ends function */,

    /**This function is used to validate edit get api */
    details: async (req, res, next) => {
        await global.validateObjId(req, "o_id", {
            findInDb: true,
            DBField: "_id",
            DB: User,
            query: true,
        });
        let errors = validationResult(req).array({ onlyFirstError: true });

        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    /**This function is used to validate changestatus api */
    // changeStatus: async (req, res, next) => {
    //     await global.validateObjId(req,'o_id', {findInDb:true, DBField:"_id", DB:User});
    //     await global.validateStatusField(req, 'status');

    //     let errors = validationResult(req).array({ onlyFirstError: true });
    //     if (errors.length == 0) {
    //         next();
    //     } else {
    //         return global.failResponse(res,MESSAGE.INVALID_REQUEST, errors);
    //     }
    // },

    changeStatus: async (req, res, next) => {
        await body("o_id")
            .trim()
            .not()
            .isEmpty()
            .withMessage("admin_err_o_id_is_required")
            .custom((value) => {
                return new Promise((resolve, reject) => {
                    try {
                        let ids = JSON.parse(req.body.o_id);
                        ids.forEach((id, i) => {
                            if (ObjectId.isValid(id)) {
                                if (i == ids.length - 1) {
                                    resolve();
                                }
                            } else {
                                reject("Invalid id");
                            }
                        });
                    } catch (err) {
                        return reject("Invalid json of ids");
                    }
                });
            })
            .run(req);
        await global.validateStatusField(
            req,
            "status",
            "admin_err_status_is_required"
        );

        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    delete: async (req, res, next) => {
        await body("o_id")
            .trim()
            .not()
            .isEmpty()
            .withMessage("admin_err_o_id_is_required")
            .custom((value) => {
                return new Promise((resolve, reject) => {
                    try {
                        let ids = JSON.parse(req.body.o_id);
                        ids.forEach((id, i) => {
                            if (ObjectId.isValid(id)) {
                                if (i == ids.length - 1) {
                                    resolve();
                                }
                            } else {
                                reject("Invalid id");
                            }
                        });
                    } catch (err) {
                        return reject("Invalid json of ids");
                    }
                });
            })
            .run(req);


        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    assignMedia: async (req, res, next) => {
        await global.validateObjId(req, "o_id", {
            findInDb: true,
            DBField: "_id",
            DB: User,
        });
        await body("media")
            .trim()
            .not()
            .isEmpty()
            .withMessage("admin_assign_media_required")
            .custom((value) => {
                return new Promise((resolve, reject) => {
                    try {
                        let json = JSON.parse(value);
                        if (Array.isArray(json)) {
                            resolve();
                        } else {
                            return reject("Invalid json");
                        }
                    } catch (err) {
                        return reject("Invalid json");
                    }
                });
            })
            .run(req);
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    chatList: async (req, res, next) => {
        await global.validateObjId(req, "user_id", {
            findInDb: true,
            DBField: "_id",
            DB: User,
        });
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    getMessages: async (req, res, next) => {
        await query("room").trim().notEmpty().withMessage("room is required").run(req);
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    messagesDelete: async (req, res, next) => {
        await body("o_id").trim().notEmpty().withMessage("admin_err_o_id_is_required").run(req);
        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },

    featured: async (req, res, next) => {
        await body("o_id")
            .trim()
            .not()
            .isEmpty()
            .withMessage("admin_err_o_id_is_required")
            .run(req);


        await body("featured").isBoolean().withMessage("this field is required").run(req)


        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },


    // This function is used for change password validation
    // changePassword: async (req, res, next) => {
    //     await body('current_password').not().isEmpty().withMessage(global.msg(req, res, 'admin_err_password_is_required'));
    //     await body("new_password")
    //         .exists({ checkNull: true, checkFalsy: true })
    //         .withMessage(global.msg(req, res, "admin_err_new_password_is_required"))
    //         .isLength({ min: PASSWORD_MIN_LENGTH })
    //         .withMessage(global.msg(req, res, "err_min_length_password").replace("{PASSWORD_MIN_LENGTH}", PASSWORD_MIN_LENGTH))
    //         .matches(/[A-Z]/)
    //         .withMessage(global.msg(req, res, "err_capital_letter_in_password"))
    //         .matches(/\d/)
    //         .withMessage(global.msg(req, res, "err_one_number_in_password"))
    //         .matches(/[@$!%*?&]/)
    //         .withMessage(global.msg(req, res, "err_one_special_char_in_password"))
    //         .custom(async (value, { req }) => {

    //             const user = await User.findOne({ _id: req.user._id });
    //             if (user) {

    //                 const isSameAsOldPassword = await bcrypt.compare(value, user.password);
    //                 if (isSameAsOldPassword) {
    //                     throw new Error(global.msg(req, res, "err_password_cannot_be_same_as_old"));
    //                 }
    //             } else {
    //                 throw new Error(global.msg(req, res, "admin_err_validate_string_is_required"));
    //             }
    //         })
    //         .run(req);
    //     await body("confirm_newpassword").not().isEmpty().withMessage(global.msg(req, res, "admin_err_c_password_is_required")).custom((value) => {
    //         return req.body.new_password === req.body.confirm_newpassword;
    //     }).withMessage(global.msg(req, res, "admin_err_c_new_is_required")).run(req);

    //     let errors = validationResult(req).array({ onlyFirstError: true });

    //     if (errors.length == 0) {
    //         next();
    //     } else {
    //         return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    //     }
    // },


    changePassword: async (req, res, next) => {

    await body('current_password')
        .notEmpty()
        .withMessage('Current password is required')
        .custom(async (value, { req }) => {

            const user = await User.findOne({ _id: req.user._id });
            if (!user) {
                throw new Error('User not found');
            }

            const isMatch = await bcrypt.compare(value, user.password);
            if (!isMatch) {
                throw new Error('Current password is incorrect');
            }

            req.userData = user;
            return true;
        })
        .run(req);


    await body("new_password")
        .exists({ checkNull: true, checkFalsy: true })
        .withMessage('New password is required')
        .isLength({ min: PASSWORD_MIN_LENGTH })
        .withMessage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`)
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/\d/)
        .withMessage('Password must contain at least one number')
        .matches(/[@$!%*?&]/)
        .withMessage('Password must contain at least one special character')
        .custom(async (value, { req }) => {

            const user = req.userData;

            const isSameAsOldPassword = await bcrypt.compare(value, user.password);
            if (isSameAsOldPassword) {
                throw new Error('New password cannot be same as old password');
            }
        })
        .run(req);


    await body("confirm_newpassword")
        .notEmpty()
        .withMessage('Confirm password is required')
        .custom((value, { req }) => {
            return value === req.body.new_password;
        })
        .withMessage('Confirm password does not match')
        .run(req);


    let errors = validationResult(req).array({ onlyFirstError: true });

    if (errors.length == 0) {
        next();
    } else {
        return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
    }
},

};


export default userValidator;
const global = require('../../../../../helpers/global-functions');
const {body, validationResult, query} = require('express-validator');
const { ObjectId } = require('mongodb');

/** Models */
const User = require('../../../../../models/users');

module.exports = {
    editProfile: async (req, res, next)=>{
        const { _id } = req.user;
        await global.validateEmailField(req,'email',{required : true, findInDb : true, DBField : 'email', DB : User,findJson:{_id:{$ne: new ObjectId(_id)}}}, {});
        await global.validateTextField(req,'name', global.msg(req, res, 'admin_err_name_is_required'));

        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            return next();
        } else {
            return global.failResponse(res, MESSAGE.INVALID_REQUEST, errors);
        }
    },/** Ends function */

    // This function is used for change password validation
    changePassword:async (req,res,next)=>{
        const {new_password} = req.body;
        await global.validateTextField(req,"current_password", global.msg(req, res, "admin_err_current_password_is_required"));
        await global.validateTextField(req,"new_password", global.msg(req, res, "admin_err_new_password_is_required"));
        await global.validateTextField(req,"confirm_newpassword", global.msg(req, res, "admin_err_confirm_newpassword_is_required"));
        await body('confirm_newpassword').custom((value)=>{
            if(new_password != value){
                return false;
            }
            return true;
        }).withMessage(global.msg(req, res, 'admin_err_c_new_is_required')).run(req);

        let errors = validationResult(req).array({onlyFirstError: true});

        if(errors.length==0){
            next();
        }else{
            return global.failResponse(res,MESSAGE.INVALID_REQUEST,errors);
        }
    },

    /**This function is used to validate edit get api */
    details:async (req,res,next)=>{
        await global.validateObjId(req,'o_id',{findInDb:true, DBField:"_id", DB:User, query:true}, {
            required:global.msg(req, res, 'admin_err_o_id_is_required')
        });
        let errors = validationResult(req).array({onlyFirstError: true});

        if(errors.length==0){
            next();
        }else{
            return global.failResponse(res,MESSAGE.INVALID_REQUEST,errors);
        }
    },

    /**This function is used to validate changestatus api */
    changeStatus: async (req, res, next) => {
        await global.validateObjId(req,'o_id', {findInDb:true, DBField:"_id", DB:User}, {
            required:global.msg(req, res, 'admin_err_o_id_is_required')
        });
        await global.validateStatusField(req, 'status', global.msg(req, res, 'admin_err_status_is_required'));

        let errors = validationResult(req).array({ onlyFirstError: true });
        if (errors.length == 0) {
            next();
        } else {
            return global.failResponse(res,MESSAGE.INVALID_REQUEST, errors);
        }
    },

    /**This function is used to validate delete api */
    delete:async (req,res,next)=>{
        await global.validateObjId(req,'o_id', {findInDb:true, DBField:"_id", DB:User}, {
            required:global.msg(req, res, 'admin_err_o_id_is_required')
        });

        let errors = validationResult(req).array({onlyFirstError: true});
        if(errors.length==0){
            next();
        }else{
            return global.failResponse(res,MESSAGE.INVALID_REQUEST, errors);
        }
    },
};
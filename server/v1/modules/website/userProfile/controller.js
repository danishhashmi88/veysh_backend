import mongoose from "mongoose";
import global from "../../../../../helpers/global-functions.js";
import User from "../../../../../models/users.js";
import async from "async"
import bcrypt from "bcrypt"
const ObjectId = mongoose.Types.ObjectId;


const routeController = {
  userDetails: async (req, res) => {
    const {_id} = req.user;

    let json = { _id: _id };
    const result = await global.getUserData(json);
    return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), result);
  },

  editUser: async (req, res) => {
    const {
      first_name,
      last_name,
      phone_number,
      address,
    } = req.body

    const _id = new ObjectId(req.user._id)

    const updatedData = {
      first_name: global.capitalizeFirstLetter(first_name),
      last_name: global.capitalizeFirstLetter(last_name),
      phone_number: phone_number,
      address: address
    }

    global.uploadFile(req, 'profile_image', 'users').then(async (imageName) => {
      if (imageName) {
        updatedData.profile_image = imageName;
      }
      User.updateOne({ _id: _id }, {
        $set: updatedData
      }).then(() => {
        return global.successResponse(res, global.msgByReq(req, "data_updated"));
      }).catch((err) => {
        return global.failResponse(res, err.message, err);
      });
    }).catch((err) => {
      return global.failResponse(res, err.message, err);
    });
  },

  updatePassword: async (req, res) => {
    const { current_password, new_password } =
      req.body;
    const { _id, password } = req.user;
    const findJson = { _id: new ObjectId(_id) };

    bcrypt
      .compare(current_password, password)
      .then(async (passwordMatch) => {
        if (passwordMatch) {
          let updateData = {
            /**Hashing the new password*/
            password: await global.incPassword(new_password),
          };
          User.updateOne(findJson, { $set: updateData })
            .then(async () => {
              return global.successResponse(
                res,
                "Password changed successfully",
                {}
              );
            })
            .catch((err) => {
              return global.failResponse(res, err.message, err);
            });
        } else {
          return global.failResponse(
            res,
            "Invalid current password",
            {}
          );
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  }
}

export default routeController;
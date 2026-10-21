import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import global from "../../../../../helpers/global-functions.js";

/** Models */
import Modal from "../../../../../models/global-settings.js";
import { MESSAGE } from "../../../../../global-variable.js";

const gsController = {
  save: async (req, res) => {
    const {
      admin_email,
      phone_number,
      address,
      copy_right_text,
      website,
      title,
      play_store_url,
      app_store_url,
      // monthly_restaurant_enrollment_cost,
      // yearly_restaurant_enrollment_cost,
      social_media_details,
      bae_media_details
    } = req.body;

    try {



      let socialMediaDetails = Array.isArray(social_media_details) ? social_media_details : JSON.parse(social_media_details);

      const baeMediaDetails = Array.isArray(bae_media_details)
        ? bae_media_details
        : JSON.parse(bae_media_details || "[]");

      //   if(socialMediaDetails.length>1){
      //     const imageName = await  global.uploadFile(req, "icon", "iconimage")

      //     for(let i=0 ; i<socialMediaDetails.length; i++){
      //         socialMediaDetails[i].icon = imageName[i]

      //     }

      //   }
      //   else{
      //     const imageName = await  global.uploadFile(req, "icon", "iconimage")
      //     socialMediaDetails[0].icon = imageName.toString()

      //   }

      let updateData = {
        admin_email,
        phone_number,
        address,
        copy_right_text,
        website,
        title,
        play_store_url,
        app_store_url,
        // monthly_restaurant_enrollment_cost,
        // yearly_restaurant_enrollment_cost,
        social_media_details: socialMediaDetails,
        bae_media_details: baeMediaDetails,
      };



      await Modal.updateOne({}, { $set: updateData }, { upsert: true });


      return global.successResponse(res, global.msg(req, res, global.msgByReq(req, "setting_updated")));
    } catch (err) {

      console.error('Error in save:', err);
      return global.failResponse(res, err.message, err);
    }
  }

  ,

  /**This function is used to get edit */
  details: (req, res) => {
    const json = {};
    Modal.aggregate([
      { $match: json },
      {
        $addFields: {
          login_bg_image: 1,
        },
      },
    ])
      .exec()
      .then(function (result) {
        if (result.length > 0) {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, result[0]);
        } else {
          return global.successResponse(res, MESSAGE.OPR_SUCCESS, {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },
};


export default gsController;
import mongoose from "mongoose";
const { Types: { ObjectId } } = mongoose;

import global from "../../../../helpers/global-functions.js";
import Modal from "../../../../models/global-settings.js";
import CMSModel from "../../../../models/cms.js";
import { ACTIVE,MESSAGE } from "../../../../global-variable.js";
import FAQ from "../../../../models/faq.js";
import async from "async";
import ContactUs from "../../../../models/contact-us.js";


const routeController = {

  details: (req, res) => {
    Modal.aggregate([
      {
        $project: {
          title: 1,
          admin_email: 1,
          phone_number: 1,
          address: 1,
          copy_right_text: 1,
          website: 1,
          monthly_restaurant_enrollment_cost: 1,
          yearly_restaurant_enrollment_cost: 1,
          social_media_details: 1,
          signup_option: 1,
          login_bg_image: 1,
          app_store_url: 1,
          play_store_url: 1
        },
      },
    ])
      .exec()
      .then(function (result) {
        if (result.length > 0) {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), result[0]);
        } else {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  cmsPage: async (req, res) => {
    const { slug, type } = req.query;
    let queryType = type || 'website';
    if (!['website', 'app'].includes(queryType)) {
      queryType = 'website';
    }

    const json = { slug: slug, status: ACTIVE, type: queryType };
    CMSModel.aggregate([
      { $match: json },
      {
        $project: {
          slug: 1,
          title: 1,
          menu_location: 1,
          footer_location: 1,
          short_description: 1,
          description: 1,
          type: 1,
        },
      },
    ])
      .exec()
      .then(function (result) {
        return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), result[0]);
      })
      .catch((err) => {
        return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
      });
  },

  FAQList: async (req, res) => {
    let type = req.query.type || 'website';
    if (!['website', 'app'].includes(type)) {
      type = 'website';
    }
    
    async.parallel(
      {
        list: (callback) => {
          FAQ.aggregate([
            { $match: { status: ACTIVE, type: type } },
            global.userDataQuery("updatedBy", "updatedBy"),
            global.userDataQuery("createdBy", "createdBy"),
            {
              $project: {
                title: global.TrDBKey(req, 'title'),
                description: global.TrDBKey(req, 'description'),
              },
            },
          ])
            .exec()
            .then(function (result) {
              callback(null, result);
            })
            .catch((err) => {
              callback(null, err);
            });
        },
      },
      (err, result) => {
        if (!err) {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), result);
        } else {
          return global.failResponse(res, MESSAGE.SOMETHING_WENT_WRONG, err);
        }
      }
    );
  },

  saveContactUs:async(req, res)=>{
  try{
      const {name, email, subject,message, type, phone} = req.body;

      console.log("[contact-us] req.body:", JSON.stringify(req.body));

      let insertData={
          name : global.capitalizeFirstLetter(name),
          email,
          subject,
          message : global.capitalizeFirstLetter(message),
          type: type || 'app',
          phone: phone || null
      };
      const contactUsCreated = await ContactUs.create(insertData);
  
      let options = {
          slug: "contact_us",
          dynamicStrings: {
              name, email, subject, message, phone: phone || "",
          },
      };

      let userOptions = {
        slug: "contact_us_confirmation",
        dynamicStrings: {
            name, email, subject, message, phone: phone || "",
        },
    };

      const settings = await global.getGlobalSettings();
      console.log("[contact-us] admin_email:", settings?.admin_email);

      const template = await global.attachEmailTemplate(options);
      const userTemplate = await global.attachEmailTemplate(userOptions);

      console.log("[contact-us] admin template:", {
        slug: "contact_us",
        subject: template?.subject,
        body_length: template?.body?.length || 0,
        body_empty: !template?.body,
        body_preview: (template?.body || "").slice(0, 400),
      });
      console.log("[contact-us] user template:", {
        slug: "contact_us_confirmation",
        subject: userTemplate?.subject,
        body_length: userTemplate?.body?.length || 0,
        body_empty: !userTemplate?.body,
        body_preview: (userTemplate?.body || "").slice(0, 400),
      });

      if (template?.body && settings?.admin_email) {
        console.log("[contact-us] sending admin mail →", settings.admin_email);
        await global.sendEmail(
            template.subject,
            settings.admin_email,
            template.body
        );
      } else {
        console.log("[contact-us] SKIP admin mail — template/body/admin_email missing");
      }

      if (userTemplate?.body && email) {
        console.log("[contact-us] sending user confirmation →", email);
        await global.sendEmail(
          userTemplate.subject,
          email,
          userTemplate.body
        );
      } else {
        console.log("[contact-us] SKIP user mail — template/body/email missing");
      }

      return global.successResponse(res, global.msg(req,res,"Your query is submitted successfully"),{contactUsCreated});    
  }catch(error){
    console.log("[contact-us] ERROR:", error?.message, error);
    return global.failResponse(res, error.message, error);
  }
},

};
export default routeController
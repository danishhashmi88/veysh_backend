import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import global from "../../../../../helpers/global-functions.js";
import UserModel from "../../../../../models/users.js";
import { USER_ROLES, ACTIVE, JWT_CONFIG, MESSAGE, PASSWORD_MIN_LENGTH } from "../../../../../global-variable.js";
import { OAuth2Client } from "google-auth-library";
const ObjectId = mongoose.Types.ObjectId;
import { UPLOAD_FILE_PATH } from "../../../../../global-variable.js";
import GlobalFunctions from "../../../../../helpers/global-functions.js";
import Posts from "../../../../../models/posts.js";
import Outfits from "../../../../../models/outfit.js";
import Items from "../../../../../models/items.js";
import Planner from "../../../../../models/planner.js";
import ReportedPosts from "../../../../../models/reported-posts.js";
import Portfolio from "../../../../../models/portfolio.js";
import PortfolioService from "../../../../../models/portfolio-service.js";


const ProfileController = {
  saveBasicProfile: async (req, res) => {
    try {
      const {
        business_name,
        professional_category_id,
        tagline,
        short_bio,
        long_bio,
        email,
        phone_number,
        countryCode,
        city,
        country,
        experience,
        expertise,
        social_media_details,
        display_preferences,
      } = req.body;

      const _id = req.user._id;

      if (!ObjectId.isValid(_id)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      //Get existing user
      const existingUser = await UserModel.findById(_id);
      if (!existingUser) {
        return global.failResponse(res, "User not found", {});
      }

      const imageName = await global.uploadFile(req, "profile_image", "users");

      const payload = {};

      // Stylist business/professional fields
      if (business_name !== undefined) payload.business_name = business_name;
      if (professional_category_id !== undefined) payload.professional_category_id = professional_category_id;
      if (tagline !== undefined) payload.tagline = tagline;
      if (short_bio !== undefined) payload.short_bio = short_bio;
      if (long_bio !== undefined) payload.long_bio = long_bio;
      if (email !== undefined) payload.email = email;
      if (phone_number !== undefined) payload.phone_number = phone_number;
      if (countryCode !== undefined) payload.countryCode = countryCode;
      if (city !== undefined) payload.city = city;
      if (country !== undefined) payload.country = country;
      if (experience !== undefined) payload.experience = experience;
      if (expertise !== undefined) {
        payload.expertise = typeof expertise === "string" ? JSON.parse(expertise) : expertise;
      }
      // if (certificates !== undefined) {
      //   payload.certificates = typeof certificates === "string" ? JSON.parse(certificates) : certificates;
      // }
      if (social_media_details !== undefined) {
        payload.social_media_details = typeof social_media_details === "string" ? JSON.parse(social_media_details) : social_media_details;
      }
      if (display_preferences !== undefined) {
        payload.display_preferences = typeof display_preferences === "string" ? JSON.parse(display_preferences) : display_preferences;
      }
      if (imageName) payload.profile_image = imageName;

      // Upload certificates files
      const certificates = await global.uploadFile(req, "certificates", "certificates");
      if (certificates) {
        payload.certificates = Array.isArray(certificates)
          ? certificates.map((cert) => `${cert}`)
          : [`${certificates}`];
      }

      // Update profile_slugs
      payload.stylist_profile_slugs = {
        ...existingUser.stylist_profile_slugs,
        basic: true,
      };

      const stylist = await UserModel.findByIdAndUpdate(
        _id,
        { $set: payload },
        { new: true, runValidators: true }
      );

      return global.successResponse(res, "Basic profile created successfully", { stylist });

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  savePrivacySettings: async (req, res) => {
    try {
      const _id = req.user._id;
      let { closetPrivacy, notification_settings } = req.body;

      const user = await UserModel.findById(_id);
      if (!user) return global.failResponse(res, "User not found", {});

      if (typeof notification_settings === "string") {
        notification_settings = JSON.parse(notification_settings);
      }

      if (closetPrivacy) user.closetPrivacy = closetPrivacy;

      if (notification_settings?.push) {
        user.notification_settings = user.notification_settings || {};
        user.notification_settings.push = notification_settings.push;
      }

      if (notification_settings?.email) {
        user.notification_settings = user.notification_settings || {};
        user.notification_settings.email = notification_settings.email;
      }

      if (notification_settings?.sms) {
        user.notification_settings = user.notification_settings || {};
        user.notification_settings.sms = notification_settings.sms;
      }

      user.profile_slugs = user.profile_slugs || {};
      user.profile_slugs.privacy = true;

      await user.save();

      return global.successResponse(res, "Privacy settings created", { user });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  userDetails: (req, res) => {
    const { _id } = req.query;
    const json = { _id: new ObjectId(_id) };
    UserModel.aggregate([
      { $match: json },
      global.userDataQuery("createdBy", "createdBy"),
      global.userDataQuery("updatedBy", "updatedBy"),
      {
        $lookup: {
          from: "users",
          localField: "following_users",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                full_name: 1,
                first_name: 1,
                last_name: 1,
                username: 1,
                profile_image: 1,
                bio: 1,
                followers: 1,
                following: 1,
                createdAt: 1,
              }
            },
          ],
          as: "following_users",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "followers_users",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                _id: 1,
                full_name: 1,
                first_name: 1,
                last_name: 1,
                username: 1,
                profile_image: 1,
                bio: 1,
                followers: 1,
                following: 1,
                createdAt: 1,
              }
            },
          ],
          as: "followers_users",
        },
      },
      {
        $project: {
          id: 1,
          full_name: 1,
          first_name: 1,
          last_name: 1,
          username: 1,
          countryCode: 1,
          phone_number: 1,
          profile_slugs: "$profile_slugs",
          DOB: 1,
          gender: 1,
          profile_slugs: 1,
          role: 1,
          email: 1,
          referral_link: 1,
          stylist_referral_link: 1,
          preferred_colors: 1,
          goals: 1,
          marketPlace: 1,
          brands: 1,
          sizes: 1,
          measurement: 1,
          dislikes: 1,
          body_type: 1,
          hair_color: 1,
          hair_type: 1,
          eye_color: 1,
          face_shape: 1,
          complexion: 1,
          preferred_colors: 1,
          brands: 1,
          style_desc: 1,
          style: 1,
          mood_board: 1,
          sustain_preferences: 1,
          pinterest_link: 1,
          assign_task: 1,
          closetPrivacy: 1,
          full_body_image: 1,
          profile_image: GlobalFunctions.userImageQueryLogo("profile_image"),
          shirt_size: 1,
          trouser_size: 1,
          assign_task: 1,
          shoe_size: 1,
          wrist_size: 1,
          address: 1,
          bio: 1,
          followers: 1,
          following: 1,
          following_users: 1,
          followers_users: 1,
          createdAt: 1,
          updatedAt: 1,
          createdBy: { $arrayElemAt: ["$createdBy", 0] },
          updatedBy: { $arrayElemAt: ["$updatedBy", 0] },
        },
      },
    ])
      .exec()
      .then(async function (result) {
        if (result.length > 0) {
          const userData = result[0];

          // Process full_body_image array (it's an array, not a single string)
          if (userData.full_body_image && Array.isArray(userData.full_body_image)) {
            userData.full_body_image = global.buildUploadUrls(userData.full_body_image);
          } else if (userData.full_body_image && typeof userData.full_body_image === 'string') {
            // Handle case where it might be a single string
            userData.full_body_image = [global.buildUploadUrl(userData.full_body_image)];
          } else {
            userData.full_body_image = [];
          }

          // Get items count
          const itemsCount = await Items.countDocuments({
            createdBy: new ObjectId(_id),
            status: ACTIVE
          });

          // Add followers, following, and itemsCount to response
          userData.followers = userData.followers || 0;
          userData.following = userData.following || 0;
          userData.itemsCount = itemsCount;

          // Process following_users array
          if (userData.following_users && Array.isArray(userData.following_users)) {
            userData.following_users = userData.following_users.map(user => ({
              ...user,
              name: user.full_name || user.first_name || user.username,
              profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
            }));
          } else {
            userData.following_users = [];
          }

          // Process followers_users array
          if (userData.followers_users && Array.isArray(userData.followers_users)) {
            userData.followers_users = userData.followers_users.map(user => ({
              ...user,
              name: user.full_name || user.first_name || user.username,
              profile_image: GlobalFunctions.buildUserImageUrl(user.profile_image),
            }));
          } else {
            userData.followers_users = [];
          }

          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), userData);
        } else {
          return global.successResponse(res, global.msg(req, res, MESSAGE.OPR_SUCCESS), {});
        }
      })
      .catch((err) => {
        return global.failResponse(res, err.message, err);
      });
  },

  updateMyProfile: async (req, res) => {
    try {
      const { first_name, last_name, username, DOB, address, gender, stylist_referral_link, goals, phone_number, countryCode, bio } = req.body;

      const _id = req.user._id;

      if (!ObjectId.isValid(_id)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (username) {
        const userWithSameUsername = await UserModel.findOne({ username });
        if (userWithSameUsername && userWithSameUsername._id.toString() !== _id.toString()) {
          return global.failResponse(res, "Username already taken", {});
        }
      }

      let updateData = {};

      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (first_name && last_name) updateData.full_name = first_name + " " + last_name;

      if (username !== undefined) updateData.username = username;
      if (DOB !== undefined) updateData.DOB = DOB;
      if (address !== undefined) updateData.address = address;
      if (gender !== undefined) updateData.gender = gender;
      if (stylist_referral_link !== undefined) updateData.stylist_referral_link = stylist_referral_link;

      if (bio !== undefined) updateData.bio = bio;

      if (phone_number !== undefined && phone_number !== null && phone_number !== "") {
        updateData.phone_number = phone_number;
      }
      if (countryCode !== undefined && countryCode !== null && countryCode !== "") {
        updateData.countryCode = countryCode;
      }

      if (goals !== undefined) updateData.goals = typeof goals === "string" ? JSON.parse(goals) : goals;

      const imageName = await global.uploadFile(req, "profile_image", "users");

      if (imageName) {
        updateData.profile_image = imageName;
      }

      const user = await UserModel.findByIdAndUpdate(_id, { $set: updateData }, { new: true }).select("-password");

      return global.successResponse(res, "Profile updated", { user });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  updatePrivacySettings: async (req, res) => {
    try {
      const _id = req.user._id;
      const { closetPrivacy } = req.body;

      let notificationSettings = req.body.notification_settings;

      if (typeof notificationSettings === "string") {
        notificationSettings = JSON.parse(notificationSettings);
      }

      const update = {};

      if (closetPrivacy) {
        update.closetPrivacy = closetPrivacy;
      }

      if (notificationSettings?.push) {
        if (notificationSettings.push.outfit_reminders !== undefined) {
          update["notification_settings.push.outfit_reminders"] =
            notificationSettings.push.outfit_reminders;
        }
        if (notificationSettings.push.likes_comments !== undefined) {
          update["notification_settings.push.likes_comments"] =
            notificationSettings.push.likes_comments;
        }
      }

      if (notificationSettings?.email) {
        update["notification_settings.email.outfit_reminders"] =
          notificationSettings.email.outfit_reminders;
        update["notification_settings.email.likes_comments"] =
          notificationSettings.email.likes_comments;
      }

      if (notificationSettings?.sms) {
        update["notification_settings.sms.outfit_reminders"] =
          notificationSettings.sms.outfit_reminders;
        update["notification_settings.sms.likes_comments"] =
          notificationSettings.sms.likes_comments;
      }

      const user = await UserModel.findByIdAndUpdate(
        _id,
        { $set: update },
        { new: true }
      ).select("-password");

      return global.successResponse(res, "Privacy settings updated", { user });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  createPortfolio: async (req, res) => {
    try {
      const {
        title,
        description,
        visibility,
        seasons,
        style_types,
        occasions,
        brand_name,
        fabric,
      } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      const imageVideoFiles = await global.uploadFile(req, "image_video", "portfolio");

      const portfolioData = {
        title: title,
        description: description,
        visibility: visibility,
        seasons: seasons,
        style_types: style_types,
        occasions: occasions,
        brand_name: brand_name,
        fabric: fabric,
        createdBy: userId,
        updatedBy: userId,
      };

      if (imageVideoFiles) {
        portfolioData.image_video = Array.isArray(imageVideoFiles)
          ? imageVideoFiles.map((file) => `${file}`)
          : [`${imageVideoFiles}`];
      }

      const newPortfolio = await Portfolio.create(portfolioData);

      return global.successResponse(res, "Portfolio created successfully", { portfolio: newPortfolio });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  createPortfolioService: async (req, res) => {
    try {
      const {
        title,
        short_desc,
        detailed_desc,
        duration,
        flat_price,
        hourly_price,
        delivery_type,
        add_ons,
      } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!title || !title.trim()) {
        return global.failResponse(res, "Title is required", {});
      }

      const existingTitleService = await PortfolioService.findOne({
        title: title.trim(),
      });

      if (existingTitleService) {
        return global.failResponse(res, "Title is already exist", {});
      }

      const serviceData = {
        title: title.trim(),
        short_desc: short_desc,
        detailed_desc: detailed_desc,
        duration: duration,
        flat_price: flat_price,
        hourly_price: hourly_price,
        delivery_type: delivery_type,
        createdBy: userId,
        updatedBy: userId,
      };

      if (add_ons !== undefined) {
        serviceData.add_ons = typeof add_ons === "string" ? JSON.parse(add_ons) : add_ons;
      }

      const newService = await PortfolioService.create(serviceData);

      return global.successResponse(res, "Portfolio service created successfully", { service: newService });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  editPortfolioService: async (req, res) => {
    try {
      const { service_id } = req.body;
      const {
        title,
        short_desc,
        detailed_desc,
        duration,
        flat_price,
        hourly_price,
        delivery_type,
        add_ons,
      } = req.body;

      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(service_id)) {
        return global.failResponse(res, "Invalid service ID", {});
      }

      const existingService = await PortfolioService.findOne({
        _id: service_id,
      });

      if (!existingService) {
        return global.failResponse(res, "Service not found", {});
      }

      if (title !== undefined && title.trim()) {
        const existingTitleService = await PortfolioService.findOne({
          title: title.trim(),
          _id: { $ne: service_id },
        });

        if (existingTitleService) {
          return global.failResponse(res, "Title is already exist", {});
        }
      }

      const updateData = {
        updatedBy: userId,
      };

      if (title !== undefined) updateData.title = title.trim();
      if (short_desc !== undefined) updateData.short_desc = short_desc;
      if (detailed_desc !== undefined) updateData.detailed_desc = detailed_desc;
      if (duration !== undefined) updateData.duration = duration;
      if (flat_price !== undefined) updateData.flat_price = flat_price;
      if (hourly_price !== undefined) updateData.hourly_price = hourly_price;
      if (delivery_type !== undefined) updateData.delivery_type = delivery_type;

      if (add_ons !== undefined) {
        updateData.add_ons = typeof add_ons === "string" ? JSON.parse(add_ons) : add_ons;
      }

      const updatedService = await PortfolioService.findByIdAndUpdate(
        service_id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return global.successResponse(res, "Portfolio service updated successfully", { service: updatedService });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  deletePortfolioService: async (req, res) => {
    try {
      const { service_id } = req.body;
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      if (!ObjectId.isValid(service_id)) {
        return global.failResponse(res, "Invalid service ID", {});
      }

      const existingService = await PortfolioService.findOne({
        _id: service_id,
        createdBy: userId,
      });

      if (!existingService) {
        return global.failResponse(res, "Service not found", {});
      }

      await PortfolioService.findByIdAndDelete(service_id);

      return global.successResponse(res, "Portfolio service deleted successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getPortfolioServices: async (req, res) => {
    try {
      const userId = req.user._id;

      if (!ObjectId.isValid(userId)) {
        return global.failResponse(res, "Invalid user ID", {});
      }

      const services = await PortfolioService.find({
        createdBy: userId,
      })
        .sort({ createdAt: -1 })
        .lean();

      return global.successResponse(res, "Portfolio services fetched successfully", {
        services: services,
        total_count: services.length,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
};

export default ProfileController;

import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const PlannerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },

    outfit_id: {
      type: Schema.Types.ObjectId,
      ref: "Outfits",
      default: null,
    },

    item_id: [
      {
        type: Schema.Types.ObjectId,
        ref: "Items",
      },
    ],

    notes: { type: String, default: null },
    remind_me_1day_before: { type: Boolean, default: false },
    remind_me_2hours_before: { type: Boolean, default: false },
    remind_me_2day_before: { type: Boolean, default: false },
    notified_2hours: { type: Boolean, default: false },
    notified_1day: { type: Boolean, default: false },
    notified_2day: { type: Boolean, default: false },
    event_date: {
      type: Date, required: true,
    },

    event_time: {
      type: String, default: null,
    },
    wear_count_added: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "Users" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "Users" },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Planner", PlannerSchema);

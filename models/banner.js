import mongoose from "mongoose";
const { Schema } = mongoose;
import globals from "../global-variable.js";

const BannerSchema = new Schema({
    title: String,
    title_ja: String,
    link: String,
    description: String,
    description_ja: String,
    image: { type: String },
    status : { type: Number, default: globals.ACTIVE },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Users', default:null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Users', default:null },
},{
    timestamps:true
});

const Banners = mongoose.model("Banners", BannerSchema);

export default Banners;

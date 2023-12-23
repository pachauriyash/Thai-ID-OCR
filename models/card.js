import mongoose from "mongoose";

// Define the schema for the "post" collection
const cardSchema= new mongoose.Schema({
  username: { type: String, default: "admin" },
  name: {
    type: String,
  },
  lastName:{
    type: String,
  },
  identification_number:{
    type: Number,
    required: true,
  },
  date_of_issue:{
    type: String,
  },
  dat_of_expiry:{
    type: String,
  },
  date_of_birth:{
    type: String,
  },
  activestatus: {
    type: Boolean,
    default: true,
  },
});

const Card = mongoose.model('Card', cardSchema);
export default Card;



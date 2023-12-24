const mongoose = require('mongoose');

// Define the schema for the "post" collection
const cardSchema= new mongoose.Schema({
  username: { type: String, default: "admin" },
  Title_of_the_Card:{
    type: String,
  },
  name: {
    type: String,
  },
  lastName:{
    type: String,
  },
  identification_number:{
    type: String,
  },
  date_of_issue:{
    type: String,
  },
  date_of_expiry:{
    type: String,
  },
  date_of_birth:{
    type: String,
  },
  status:{
    type: String,
  },
  errorcomment: {
    type: Object,
  },
  activestatus: {
    type: Boolean,
    default: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Card = mongoose.model('Card', cardSchema);
module.exports = Card;



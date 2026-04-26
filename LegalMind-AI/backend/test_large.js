const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('./models/User.js');
  const user = await User.findOne({});
  if (!user) {
      console.log('No user found');
      process.exit(1);
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  
  const formData = new FormData();
  formData.append('pdfFile', fs.createReadStream(path.join(__dirname, 'dummy_10.5mb.pdf')));
  
  try {
    const res = await axios.post('http://localhost:5000/api/document/upload', formData, {
        headers: { ...formData.getHeaders(), Authorization: 'Bearer ' + token },
        maxBodyLength: Infinity, maxContentLength: Infinity
    });
    console.log('UPLOAD SUCCESS:', res.data.message);
  } catch(err) {
    console.log('UPLOAD FAILED:', err.response ? err.response.data : err.message);
  }
  process.exit(0);
}
run();

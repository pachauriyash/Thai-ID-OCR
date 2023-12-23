require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const OpenAI = require('openai');
const app = express();

// Connect to MongoDB using Mongoose
mongoose.connect('mongodb://localhost:27017/thai-id-ocr');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

//setup for Google vision API
const CONFIG={
    credentials:{
        client_email:process.env.CLIENT_EMAIL,
        private_key:process.env.PRIVATE_KEY,
    }
}
//setup client for for google vision API
const client=new vision.ImageAnnotatorClient(CONFIG);
//function to detect text from an image using google vision API format DOCUMENT_TEXT_DETECTION
const detecttext = async (image) => {
    const [result] = await client.documentTextDetection({
        image: { content: image },
         imageContext: { languageHints: ['en-t-i0-handwrit'] }
    });
    const detections = result.textAnnotations;
    const [first] = detections;
    console.log(first);
    return first;
}

//setup for OpenAI API for restructuring and parsing the data from scanned OCR text
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});




//Routes for the application
app.get('/', (req, res) => {
    // Render home page
    res.render('home');
});

// Image upload and OCR processing route
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        // Process the uploaded file with Google Vision API
        const result = await detecttext(req.file.buffer);

        // Extract relevant information from the OCR result and also consider error handling
        const extractedText = result ? result.description : 'No text detected';

        // Use OpenAI chatgpt 3.5 turbo model to analyse and parse the data from the scanned text and give relevant output
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", 
            content: "You are a helpful assistant that helps people to extract information from their Thai ID cards." 
        },
        { role: "user", content: `Analyse the scanned OCR text and provide the following information in JSON format:

        **Scanned OCR text:**
        ${extractedText}
        
        **Instructions:**
        1. Read the provided OCR text and extract the information as specified below.
        2. If unable to recognize data for a specific field, write "NOT FOUND" in that field.
        3. Maintain accuracy and precision in extraction.
        4. Ensure that the name includes any salutation (e.g., Miss, Mr.) mentioned in the text.
        5. Identify the date of issue located just before the term "dateofissue."
        6. Similarly, locate and extract the dateofbirth and dateofexpiry based on their respective indicators.
        7. Date formats should be in dd/mm/yyyy; if the format is inconsistent or incomplete, mark the field as "NOT FOUND."
        8. If a category (name, last name, date-of-birth, date-of-issue, date-of-expiry) is not immediately followed by the relevant information, mark that field as "NOT FOUND."
        9. Return the data in the following format:
            - Identification Number: 1-4-5-2-1 digits (separated by spaces)
            - Name: Followed by any salutation (e.g., Miss, Mr.)
            - Last Name: Followed by the term "last name"
            - Date of Birth: dd/mm/yyyy format
            - Date of Issue: dd/mm/yyyy format
            - Date of Expiry: dd/mm/yyyy format
            - Title of the Card: Thai National ID Card (or any other title mentioned)
        10. IMPORTANT: If you get input ocr text as "No text detected", return all the fields as "NOT FOUND".
        Use natural language understanding to recognize relevant information from the OCR text.
            ` },
        ],
            model: "gpt-3.5-turbo",
          }); 

        // Return the extracted text as JSON response
        // console.log(JSON.parse(completion.choices[0].message.content));
        res.json(JSON.parse(completion.choices[0].message.content));
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
});


// Starting the server on port 3000 or the port defined in the environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

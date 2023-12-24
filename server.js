require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const OpenAI = require('openai');
const Card = require('./models/card');
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
    return first;
}

//setup for OpenAI API for restructuring and parsing the data from scanned OCR text
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

//Validation function to validate the parsed data to be stored in the database
const validate = (data) => {
    const errors = {};
    let status = true;

    // 1. Validate Name and Last_Name based on the regex pattern to check if any digit is there or not
    if (!data.name || /\d/.test(data.name) || data.name === 'NOT FOUND' || /\d/.test(data.lastName) || data.lastName === 'NOT FOUND') {
        errors.name = 'Name not found';
        status = false;
    }

    // 2. Validate Identification_Number based on the regex pattern
    const idNumberPattern = /^\d{1}\s\d{4}\s\d{5}\s\d{2}\s\d{1}$/;
    if (!data.identification_number || !idNumberPattern.test(data.identification_number) || data.identification_number === 'NOT FOUND') {
        errors.identification_number = 'Invalid Identification Number';
        status = false;
    }

    // 3. Validate Date formats based on the regex pattern
    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (
        !data.date_of_issue ||
        !datePattern.test(data.date_of_issue) ||
        !data.date_of_expiry ||
        !datePattern.test(data.date_of_expiry) ||
        !data.date_of_birth ||
        !datePattern.test(data.date_of_birth) ||
        data.date_of_issue === 'NOT FOUND' ||
        data.date_of_expiry === 'NOT FOUND' ||
        data.date_of_birth === 'NOT FOUND'
    ) {
        errors.invalid_dates = 'Invalid dates';
        status = false;
    }

    // 4. Validate Title_of_the_Card to be Thai National ID Card
    if (!data.Title_of_the_Card || data.Title_of_the_Card.toLowerCase() !== 'thai national id card') {
        errors.title_of_the_card = 'Invalid card type';
        status = false;
    }

    return { status, error: errors };
};



//Routes for the application
// Home page get route
app.get('/', async (req, res) => {
    try {
        // Get all cards with active status true
        const ocrRecords = await Card.find({ activestatus: true });
        // console.log(ocrRecords);
        // Render home page with ocrRecords in reverse order or basically latest to oldest
        res.render('home', { previousCards: ocrRecords.reverse() });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
//Function to convert the dates format to the ones required in form to edit the record
const formatToYYYYMMDD = (dateString) => {
    const [day, month, year] = dateString.split('/');
    return `${year}-${month}-${day}`;
  };

//get route for edit page
app.get('/edit/:id', async (req, res) => {
    try {
        // Get the record by id
        const recordId = req.params.id;
        const existingRecord = await Card.findById(recordId);
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }
       // Convert date formats
       existingRecord.date_of_expiry = formatToYYYYMMDD(existingRecord.date_of_expiry);
       existingRecord.date_of_issue = formatToYYYYMMDD(existingRecord.date_of_issue);
       existingRecord.date_of_birth = formatToYYYYMMDD(existingRecord.date_of_birth);
        // Render edit page with the record
        res.render('edit', { record: existingRecord });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}
);
//function to convert the dates format from the updaret form to the ones required in database
const formatToDDMMYYYY = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};
app.post('/edit/:id', async (req, res) => {
    try {
        // Get the record by id
        const recordId = req.params.id;
        const existingRecord = await Card.findById(recordId);
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        // Update the record with the new data
        if (req.body.name) {
            existingRecord.name = req.body.name;
        }
        if (req.body.lastName) {
            existingRecord.lastName = req.body.lastName;
        }
        if (req.body.identificationNumber) {
            existingRecord.identification_number = req.body.identificationNumber;
        }
        if (req.body.dateOfIssue) {
            
            existingRecord.date_of_issue = formatToDDMMYYYY(req.body.dateOfIssue);
        }
        if (req.body.dateOfExpiry) {
            existingRecord.date_of_expiry = formatToDDMMYYYY(req.body.dateOfExpiry);
        }
        if (req.body.dateOfBirth) {
            existingRecord.date_of_birth = formatToDDMMYYYY(req.body.dateOfBirth);
        }
        // Save the updated record
        await existingRecord.save();
        // Redirect to home page
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}
);

// Image upload and OCR processing route and creating the OCR record
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
        3. Maintain accuracy and precision in extraction. Also you'll have previous outputs so maintain consistency with you structuring.
        4. Ensure that the name includes any salutation (e.g., Miss, Mr.) mentioned in the text.
        5. Identify the date of issue located just before the term "dateofissue."
        6. Similarly, locate and extract the dateofbirth and dateofexpiry based on their respective indicators.
        7. Date formats should be in dd/mm/yyyy; if the format is inconsistent or incomplete, mark the field as "NOT FOUND."
        8. If a category (name, last name, date-of-birth, date-of-issue, date-of-expiry) is not immediately followed by the relevant information, mark that field as "NOT FOUND."
        9. Return the data strictly in the following format as a JSON OBJECT and handle errors as explicitly mentioned above:
            - Identification_Number: 1digit 4digits 5digits 2digits 1digit (separated by spaces)
            - Name: Followed by any salutation (e.g., Miss, Mr.) the term "name"
            - Last_Name: Followed by the term "last name"
            - Date_of_Birth: dd/mm/yyyy format (if it is 1/1/yyyy then append 0 before to make it like 01/01/yyyy)
            - Date_of_Issue: dd/mm/yyyy format (if it is 1/1/yyyy then append 0 before to make it like 01/01/yyyy)
            - Date_of_Expiry: dd/mm/yyyy format (if it is 1/1/yyyy then append 0 before to make it like 01/01/yyyy)
            - Title_of_the_Card: Thai National ID Card (or any other title mentioned)
        10. IMPORTANT: If you get input ocr text as "No text detected", return all the fields as "NOT FOUND".
        Use natural language understanding to recognize relevant information from the OCR text.
            ` },
        ],
            model: "gpt-3.5-turbo",
          }); 

        // Return the extracted text as JSON response
        const cardobject = {
            name: JSON.parse(completion.choices[0].message.content).Name,
            lastName: JSON.parse(completion.choices[0].message.content).Last_Name,
            identification_number: JSON.parse(completion.choices[0].message.content).Identification_Number,
            date_of_issue: JSON.parse(completion.choices[0].message.content).Date_of_Issue,
            date_of_expiry: JSON.parse(completion.choices[0].message.content).Date_of_Expiry,
            date_of_birth: JSON.parse(completion.choices[0].message.content).Date_of_Birth,
            Title_of_the_Card: JSON.parse(completion.choices[0].message.content).Title_of_the_Card,
        };
        // Validate the extracted data for further checks of accuracy and precision
        const validation = validate(cardobject);

        // Create a new record in the Card schema
        const newCard = new Card({
            name: cardobject.name,
            lastName: cardobject.lastName,
            identification_number: cardobject.identification_number,
            date_of_issue: cardobject.date_of_issue,
            date_of_expiry: cardobject.date_of_expiry,
            date_of_birth: cardobject.date_of_birth,
            status: validation.status ? 'Valid' : 'Invalid',
            errorcomment: validation.error,
            Title_of_the_Card: cardobject.Title_of_the_Card,
        });
        // Save the new card to the database
        await newCard.save();
        console.log(newCard);
        //Redirect to home page to display the latest upto date records and this new one as well
        res.redirect('/');
        
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
});

//Route/API endpoint for soft deleting a record
app.delete('/delete-record/:id', async (req, res) => {
    try {
        const recordId = req.params.id;

        // Check if the record exists
        const existingRecord = await Card.findById(recordId);
        if (!existingRecord) {
            return res.status(404).json({ success: false, message: 'Record not found' });
        }

        // Soft delete the record by updating the activestatus to false
        existingRecord.activestatus = false;
        await existingRecord.save();
        // Respond with success
        res.json({ success: true, message: 'Record soft deleted successfully' });
    } catch (error) {
        console.error('Error soft deleting record:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});


// Starting the server on port 3000 or the port defined in the environment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

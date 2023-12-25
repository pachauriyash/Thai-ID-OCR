# Live link for the project

**Note:** This app is hosted on render.com, and its free tier is being used, so it might take a minute for the server to spin up initially.

https://thai-id-ocr-j8ui.onrender.com

# Thai-ID-OCR

This webApp empowers organisations to upload and extract relevant information from Thai National Id cards and store them in databases.

## Technologies

This WebApp is built using the following technologies:

- Frontend: EJS templates
- Backend: Node.js, Express.js
- Database: MongoDB Atlas

## CRUD API Endpoints

- ### Create
  - `Get '/' `
    - This route renders the homepage with all the records sent as props using 'previousCards' and has the following functionalities:
      - Allowed image types: '.jpeg', '.png', '.jpg' with image size restricted to 2MB
      - Upload button with post functionality to handle upload
      - Filters based on 'Date on which the card is created' and 'Status' which can be Success or Failure
      - Delete card button to execute the delete endpoint and edit card button to handle the edit operation
  - `Post '/upload' `
    - This route handles the create functionality to add to MongoDB, handling the OCR processing.

- ### Read
  - `Get '/' `
    - This endpoint handles the read operation to read all the cards from MongoDB and send them as props while rendering the homepage.

- ### Update
  - `Get '/edit/:id' `
    - This route renders the edit page with the content of the card with the given id passed as params.
      - Editable form with prefilled details and an edit button to send a post request to handle edit functionality
      - Cancel button to take back to the homepage
  - `Post '/edit/:id' `
    - This route handles the edit functionality of the particular entry by finding it using the id passed as params and updating it from the information received from the form.
      - Also performs additional validation to check and update the status and errors in the updated data.

- ### Delete
  - `Delete '/delete-record/:id' `
    - This route performs a soft delete on the card with the given id passed as params.
      - Soft delete is performed by updating the active status in the schema to false.

## Response

The output is displayed in the home page in list of all cards and by clicking on the card the format of output is
```json

{                                                
    "identification_number": "4 7363 39613 02 7",
    "name": "Miss. Palalee",
    "last_name": "Warasiri",
    "date-of-birth": "21/09/1991",
    "date-of-issue": "28/10/2021",
    "date-of-expiry": "20/09/2030"
}
```

## Installation

To run the Project locally, follow these steps:

1. Clone the repository: `git clone https://github.com/pachauriyash/Thai-ID-OCR.git`
2. Install dependencies: `npm install`
3. Create a .env file
4. Setup google cloud account by registering, create a project and enable Google Vision API, then create a service account and create credentials.
5. Find the private_key and client_email from the credentials .json file which you got after creating credentials in previous step.
6. Now visit https://www.base64encode.org/ and convert your 'private_key' into base64 format.
7. Now in the .env file place the encoded at PRIVATE_KEY=<Private_Key> and your CLIENT_EMAIL=<Cleint_email> placeholders.
8. Visit https://platform.openai.com/ and login into your developer account and create a api_key.
9. Now again in .env file place OPENAI_API_KEY=<openai_api_key> 
10. Set up your MongoDB connection string and in .env file MONGO_URI=<mongo_uri>
11. Start your application: `node server.js`

After installation, you can access it on `http://localhost:3000` in your web browser.

Note: This installation process is considering you've node and npm installed otherwise first install those.

## Features

- Used google vision API to extract the OCR data from the uploaded image.
- Used OpenAi api with Gpt-3.5-turbo to analyse the scanned text and parse the relevant information.
- Store the Cards in MongoDB database.
- Edit any particular card information.
- Delete any particular card.
- Advanced features such as Error handling for edge cases such as (information not present, wrong type of card, invalid formats of date or identification number, information not visible).
- User-friendly interface: The App offers an intuitive and seamless user interface.
- Responsive design


## Screenshots
<img width="1440" alt="Screenshot 2023-12-25 at 7 23 09 PM" src="https://github.com/pachauriyash/Thai-ID-OCR/assets/86353193/d5d4095c-da63-42f2-a5cf-2bcf6bb2e1e1">

<img width="1440" alt="Screenshot 2023-12-25 at 10 20 04 PM" src="https://github.com/pachauriyash/Thai-ID-OCR/assets/86353193/fe8beed7-4662-40b6-8918-b23506d1a958">

<img width="1440" alt="Screenshot 2023-12-25 at 7 23 39 PM" src="https://github.com/pachauriyash/Thai-ID-OCR/assets/86353193/2ec07555-3bdf-4d7a-a673-e8dba449d388">

<img width="1440" alt="Screenshot 2023-12-25 at 7 23 47 PM" src="https://github.com/pachauriyash/Thai-ID-OCR/assets/86353193/ac7bc9d0-59f9-4e1c-8e28-75b89794b388">








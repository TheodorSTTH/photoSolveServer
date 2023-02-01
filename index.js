const express = require("express");
const app = express();
const T = require("tesseract.js");
require("dotenv").config();
const multer = require("multer");
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs');
const helmet = require('helmet')

const configuration = new Configuration({
    apiKey: process.env.OPEN_AI_KEY
})
const openai = new OpenAIApi(configuration);

let theFileName = "nothing";
let filopolio = null;
async function imageToText(name) {
    const res = T.recognize("./images/" + name, "eng", { logger: e => null})
    .then(out => {
        // console.log(out.data.text);
        return {
            success: true,
            data: out.data.text
        }
    })
    .catch(error => {
        return {
            success: false,
            data: error
        }
    });
    return res;
}
async function questionToAnswer(prompt) {
    try {
        const response = await openai.createCompletion({
            model: "text-davinci-003",
            prompt: "Write a short answer to the following: " + prompt + " ###",
            max_tokens: 84,
            temperature: 0.4,
            top_p: 1.0,
            frequency_penalty: 0,
            presence_penalty: 0
        })
        // console.log(response.data)
        return {
            success: true,
            data: response.data.choices[0].text
        }
    }
    catch (err) {
        console.error("CATCH", err)
        return {
            success: false,
            data: err
        }
    }
}
function getLengthOfFilesInImages() {
    // const dir = './images';
    // let allImages = []
    const length = fs.readdirSync('./images').length
    return length;
}
function generateFileName(num) {
    const fileNumberStr = num.toString().length === 3 ? num.toString() : (num.toString().length === 1 ? "00" + num.toString() : "0" + num.toString());
    const name = "IMG_" + fileNumberStr + ".png"
    return name
}
function deleteFirstImages() {
    console.log("deleteFirstImages called")
    // for(let i = 0 + 1; i < 3 + 1; i++) {
        // fs.unlink('./images/' + generateFileName(i), function (err) {
        //     if (err) throw err;
        //     console.log('File deleted!');
        // });
    // }
    const folder = './images/';
    let count = 0;
    const filesToBeDeleted = 5;
    fs.readdirSync(folder).forEach(file => {
        count++;
        if (count < filesToBeDeleted + 1) {
            fs.unlink('./images/' + file, function (err) {
                if (err) throw err;
                console.log('File deleted!');
            });
        }
    });
}
let fileType = "";
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images")
    },
    filename: (req, file, cb) => {
        if (!(file.mimetype[0] === "i" && file.mimetype[1] === "m" && file.mimetype[2] === "a" && file.mimetype[3] === "g" && file.mimetype[4] === "e")) return cb(JSON.stringify({error: true, data: "You can only upload images"}))
        // const randIntString = Math.floor(Math.random() * 91).toString()
        const lengthOfImagesFolder = getLengthOfFilesInImages();
        if (lengthOfImagesFolder > 45) {
            deleteFirstImages();
        }
        // const newFileNumber = (lengthOfImagesFolder + 1).toString().length === 3 ? (lengthOfImagesFolder + 1).toString() : ((lengthOfImagesFolder + 1).toString().length === 1 ? "0" + (lengthOfImagesFolder + 1).toString() : "00" + (lengthOfImagesFolder + 1).toString());
        // // const name = "IMG_" + (randIntString.length === 3 ? randIntString : (randIntString.length === 2) ? "0" + randIntString : "00" + randIntString) + ".png";
        // const name = "IMG_" + newFileNumber + ".png"
        const name = generateFileName(lengthOfImagesFolder + 1)
        theFileName = name;
        cb(null, name);
    }
})

const upload = multer({storage: storage})

app.set("view engine", "ejs");
app.use(helmet())
app.disable('x-powered-by')
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
})

app.get("/upload", (req, res) => {
    res.render("upload");
})

app.post("/upload", upload.single("image"), async (req, res) => {
    // console.log(req)
    const text = await imageToText(theFileName);
    const answer = await questionToAnswer(text.data);
    res.send({...answer, "yo": JSON.stringify(fileType)});
})

app.listen(3001)
console.log("Listening on port 3001")
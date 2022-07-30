const http = require('http');
const fetch = require('node-fetch');
const fs = require("fs");
const nodemailer = require("nodemailer");

const PORT = process.env.PORT || 5000;
const sepInEmails = ' ';
const pathToEmails = "emails.txt";

async function getRateBtcToUah() {
    const url = 'https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5';
    const options = {
        method: 'GET', 
        headers: {
            Accept: 'application/json'
        }
    };
    let rates;
    await fetch(url, options)
        .then(res => res.json())
        .then(json => {
            rates = json;
        })
        .catch(err => {
             res.writeHead(400, {});
             return res.end('Invalid status value');
        });
    return (parseFloat(rates[2].sale) * parseFloat(rates[0].sale)).toFixed(2);
}
function getParameter (data) {
    data = data.toString();
    arr = data.split('=');
    return arr[1];
}
async function sendRate(res) {
    let rate = await getRateBtcToUah();
    res.writeHead(200, {
        'Content-type': 'application/json; charset=utf-8'
    });
    return res.end(rate);
}
function subscribe(req, res) {
    let email = '';
    req.on('data', function (data) {
        email = getParameter(data);
        let hasError = false;
        let emails = fs.readFileSync(pathToEmails, { encoding: 'utf8' }).split(sepInEmails);
        emails.forEach(x => {
            if (x == email) {
                hasError = true;
                return;                
            }
        });
        if (hasError) {
            res.writeHead(409, {
                'Content-type': 'text/html; charset=utf8'
            });
            return res.end('Already exists');
        }
        emails.push(email);
        fs.writeFileSync(pathToEmails, emails.join(sepInEmails), { encoding: 'utf8', flag: 'w' });
        res.writeHead(200, {
            'Content-type': 'text/html; charset=utf8'
        });
        res.end();
    });
}
async function sendEmails(res) {
    let emailFrom = '<email>';
    let password = '<pass>';
    let transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        auth: {
            user: emailFrom,
            pass: password
        }
    });
    let rate = await getRateBtcToUah();
    let emails = fs.readFileSync(pathToEmails, { encoding: 'utf8' }).split(sepInEmails);
    emails.forEach(userEmail => {
        let message = {
            from: emailFrom,
            to: userEmail,
            subject: 'Rate BTC to UAH',
            text: rate
        };
        transporter.sendMail(message, (err, info) => {
            if (err) {
                console.error(err)
            }
        });
    });
    res.writeHead(200, {
        'Content-type': 'text/html; charset=utf-8'
    });
    return res.end();
}
const server = http.createServer(async (req, res) =>  {
    if (req.url == '/rate' && req.method == 'GET') {
        return sendRate(res);
    } else if (req.url == '/subscribe' && req.method == 'POST') {
        return subscribe(req, res);
    } else if (req.url == '/sendEmails' && req.method == 'POST') {
        return sendEmails(res);
    } else {
        res.writeHead(404, {
            'Content-type': 'text/html; charset=utf8'
        });
        res.end('Endpoint not found');
    }
});

server.listen(PORT, () => {
    console.log('Server started');
});

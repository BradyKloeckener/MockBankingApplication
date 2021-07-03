// download and install nodejs from nodejs.org
// when finished open terminal and navigate to project directory
// npm init
// npm install express body-parser mysql express-session path bcrypt moment ejs --save
//Create database using the bank.sql file
//edit config copy.js file with your database username and password 
// rename config copy.js to "config.js"
// to run enter  node server.js in terminal
// go to localhost:3000 to see login page
// Click the link to the signup page and enter the data to open an account
// if account was successfully created you will be sent to the login page 
// login using your credentials


const express = require("express")
const session = require("express-session")
const mysql = require("mysql")
const bodyParser = require("body-parser")
const path = require('path')
const bcrypt = require('bcrypt')
const moment = require('moment')
const creds = require('./config')



const app = express()


app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret:'lafjekjfo39rt0t4-))_R03i9rt4#REW"QR#', // value here can be anything
    resave: true,
    saveUninitialized: true
}))
app.set('view engine', 'ejs')

// connect to database 
//add your database username and password to the config file
//rename config copy.js to config.js
const connection = mysql.createConnection({

    host: "localhost",
    database: "bank",
    user: creds.USER,   
    password:creds.PASS
})


app.get('/', function (req,res){
    res.sendFile(path.join(__dirname +'/html/login.html'))
})

app.get('/signup', function (req,res){
    res.sendFile(path.join(__dirname +'/html/signup.html'))
})

app.get('/openaccount', function (req,res){
    if(req.session.loggedin){
        res.sendFile(path.join(__dirname +'/html/openaccount.html'))
    }
})

app.get('/addSigner', function (req,res){
    if(req.session.loggedin){
        res.sendFile(path.join(__dirname +'/html/addSigner.html'))
    }
})
// Sends the transfer form to the user
app.get('/transfer', function(req, res){
    if(req.session.loggedin){
        res.sendFile(path.join(__dirname +'/html/transfer.html'))
    }
})


// Happens when you login successfull
//Gets the necessary database and renders accountinfo.ejs
// Issue: shows the bank account data twice if a signer is added to that account 
//Shows transactions more than once as well 
app.get('/accountinfo', function (req,res){
    var data
    if(req.session.loggedin){
        const ID = req.session.ID
        data ={ ID: ID}
        connection.query('select * from signs', function (error, results){
        
        if(error){
            console.error(error.message)
        }
        if(results.length > 0){

            connection.query('select bank_account.account_number, bank_account.balance from bank_account, signs where bank_account.account_owner = ? or (signs.account_number = bank_account.account_number and signs.signer = ? and bank_account.account_owner != ?);', [req.session.ID, req.session.ID, req.session.ID], (error, results) =>{
                if(error){
                    return console.error(error.message)
                }   
                data = {...data, accounts: results}
                connection.query("SELECT DISTINCT transaction.transaction_num, transaction.sender_acc, transaction.receiver_acc, transaction.ammount, transaction.time_stamp FROM transaction, bank_account, signs WHERE (transaction.sender_acc = bank_account.account_number or transaction.receiver_acc = bank_account.account_number) and (bank_account.account_owner =? or (signs.account_number = bank_account.account_number and signs.signer = ? and bank_account.account_owner != ?))ORDER BY time_stamp DESC LIMIT 10", [req.session.ID, req.session.ID, req.session.ID], function(error, results){
    
                    data = {...data, transactions: results}
                res.render('accountInfo', {data:data})
                })
            })

        }else{
            connection.query('select account_number, balance from bank_account where account_owner = ?;', [req.session.ID], (error, results) =>{
                if(error){
                    return console.error(error.message)
                }   
                data = {...data, accounts: results}
                connection.query("SELECT DISTINCT transaction.transaction_num, transaction.sender_acc, transaction.receiver_acc, transaction.ammount, transaction.time_stamp FROM transaction, bank_account WHERE (transaction.sender_acc = bank_account.account_number or transaction.receiver_acc = bank_account.account_number) and (bank_account.account_owner =?) ORDER BY time_stamp DESC LIMIT 10", [req.session.ID, req.session.ID], function(error, results){
    
                    data = {...data, transactions: results}
                res.render('accountInfo', {data:data})
                })
            })
        }
        
        })
        
    }else{
        res.redirect('/')
    }
})

//gets necessary data from database and renders transactionHistory.ejs
// Like in accountinfo it shows the transaction data twice
app.get('/history', function(req, res){
    if(req.session.loggedin){
        var data = {}


        connection.query('select * from signs', function (error, results){
        
            if(error){
                console.error(error.message)
            }
            if(results.length > 0){

                connection.query("SELECT DISTINCT transaction.transaction_num, transaction.sender_acc, transaction.receiver_acc, transaction.ammount, transaction.time_stamp FROM transaction, bank_account, signs WHERE (transaction.sender_acc = bank_account.account_number or transaction.receiver_acc = bank_account.account_number) and (bank_account.account_owner =? or (signs.account_number = bank_account.account_number and signs.signer = ?))ORDER BY time_stamp DESC", [req.session.ID, req.session.ID], function(error, results){
            
                    if(error){
                        console.error(error.message)
                    }
                    data =  {...data, transactions: results}
                    res.render('transactionHistory', {data: data})
                })
            }else{
                
                connection.query("SELECT DISTINCT transaction.transaction_num, transaction.sender_acc, transaction.receiver_acc, transaction.ammount, transaction.time_stamp FROM transaction, bank_account WHERE (transaction.sender_acc = bank_account.account_number or transaction.receiver_acc = bank_account.account_number) and bank_account.account_owner =? ORDER BY time_stamp DESC", [req.session.ID], function(error, results){
            
                    if(error){
                        console.error(error.message)
                    }
                    data =  {...data, transactions: results}
                    res.render('transactionHistory', {data: data})
                })
            }
        })
    }          
})


//Works
// when submiting the sign up form 
//Checks credentials and redirects to the login page if the account was created successfully
app.post('/add', async function(req ,res){

    try{
        // save the form data to variables
        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const userName = req.body.userName
        const password = req.body.password
        const confirmPassword = req.body.confirmPassword
        let ID

        if(firstName && lastName && userName && password && confirmPassword){
            if(password == confirmPassword){
                
                //hash and salt passwords
                let salt = await bcrypt.genSalt()
                let hash = await bcrypt.hash(password,salt)
                
                connection.query("SELECT id FROM customer", function(error, results){
                    if(error){
                        console.error(error.message)
                    }
                    
                    if(results.length == 0){
                        ID = Math.floor(Math.random() * (100000000 - 10000000) + 10000000)
                    }else{
                        connection.query("SELECT FLOOR(10000000 + RAND()* 999999) AS random_number FROM customer WHERE 'random_number' NOT IN (SELECT id FROM customer) LIMIT 1", function(error, results){
                            if(error){
                                console.error(error.message)
                            }
                            ID = results[0].random_number
                        })
                    }
                    connection.query("SELECT user_name FROM customer WHERE user_name = ?",[userName],(error, results) =>{
                        if(error){
                            console.error(error.message)
                        }
                        if(results.length > 0){
                            res.send("This username is already in use by another user")
                        }else{
        
                            connection.query(`INSERT INTO customer(id, first_name, last_name, user_name, pass_hash) VALUES ('${ID}','${firstName}','${lastName}','${userName}','${hash}')`,
                            (error)=>{
                                if(error){
                                    return console.error(error.message)
                                }   
                            res.redirect('/')
        
                            })
                        }
                    })
                })
            }else{
                res.send("passwords do not match")
            }
        }else{
            res.send('Please fill out all fields')
        }
    }catch{
        res.send()
    }
})

//Works
// when submitting the login form 
// checks credentials
app.post('/auth', function (req, res){

    const userName = req.body.userName
    let password = req.body.password
    let ID

    if(userName && password){
        connection.query("SELECT id, user_name, pass_hash FROM customer WHERE user_name=?", [userName],(error, results) =>{
            if(error){
                return console.error(error.message)
            } 
            if(results.length > 0){
                const match = bcrypt.compareSync(password, results[0].pass_hash)
                    if(match){
                        ID = results[0].id
                        req.session.ID = ID
                        req.session.loggedin =true
                        res.redirect('/accountInfo')
                    }else{
                        res.send("Incorrect ID or password")
                    }
                    
            }
            else{
                res.send('Incorrect ID or password')
            }
            res.end()
        });   
    }else{
        res.send('Enter an ID and password')
    }
})

//Works
// opens a new bank account with starting balance entered and adds it to the database
app.post('/open', function (req, res){

    const startingBalance = req.body.balance
    const ID = req.session.ID
    let accountNumber 

    if(startingBalance){

        connection.query("SELECT account_number FROM bank_account", function(error, results){
            if(error){
                console.error(error.message)
            }
            if(results.length == 0){
                accountNumber = Math.floor(Math.random() * (100000000 - 10000000) + 10000000)
                connection.query(`INSERT INTO bank_account(account_number, balance, account_owner) VALUES ('${accountNumber}','${startingBalance}','${ID}')`,
                (error)=>{
                    if(error){
                        return console.error(error.message)
                    }   
                    res.redirect("/accountinfo")
                })   
            }else{
                connection.query("SELECT FLOOR(10000000+ RAND()* 999999) AS random_number FROM bank_account WHERE 'random_number' NOT IN (SELECT account_number FROM bank_account) LIMIT 1", function(error, results){

                if(error){
                    console.error(error.message)
                }
                accountNumber = results[0].random_number
                    connection.query(`INSERT INTO bank_account(account_number, balance, account_owner) VALUES ('${accountNumber}','${startingBalance}','${ID}')`,
                    (error)=>{
                        if(error){
                            return console.error(error.message)
                        }   
                        res.redirect("/accountinfo")
                    })   
                })
               
            }
 
        })    
    }else{
        res.send('Enter a starting balance for your account')
    }
})

//WORKS
// Generates random transaction number and inserts the transaction into the database if valid
//updates the balances of the 2 accounts
app.post('/makeTransaction', function(req, res){
    
    const senderAccount = req.body.senderAccount
    const receiverAccount = req.body.receiverAccount
    const ammount = req.body.Ammount
    let transNumber

    if(senderAccount && receiverAccount && ammount){
        if(senderAccount == receiverAccount){
            res.send("The sender and receiver cannot be the same")
        }else{
            connection.query("SELECT transaction_num FROM transaction", function(error, results){
                if(error){
                    console.error(error.message)
                }
                if(results.length == 0){
                    transNumber = Math.floor(Math.random() * (100000000 - 10000000) + 10000000)
                }else{
                    connection.query("SELECT FLOOR(10000000+ RAND()* 999999) AS random_number FROM transaction WHERE 'random_number' NOT IN (SELECT transaction_num FROM transaction) LIMIT 1", function(error, results){
                        if(error){
                            console.error(error.message)
                        }
                        transNumber = results[0].random_number
                    })
                }
                connection.query( 'SELECT * FROM bank_account WHERE account_owner=? AND account_number=?', [req.session.ID, senderAccount], 
                function (error, results){

                    if(error){
                        return console.error(error.message)
                    }
                    if(results.length > 0){
                        if(results[0].balance < ammount){
                            res.send("Insufficient Funds")
                            
                        }else{
                        connection.query('SELECT account_number FROM bank_account WHERE account_number = ?', receiverAccount, function (error, results) {
                            if(error){
                                return console.error(error.message)
                            }
                            if(results.length > 0){
                                connection.query("INSERT INTO transaction VALUES('"+transNumber+"','" +senderAccount+"','"+ receiverAccount+"','"+ammount+"','" + moment(Date.now()).format('YYYY-MM-DD HH:mm:ss')+"')", function(error, results){
                                    if(error){
                                        return console.error(error.message)
                                    }
                                    connection.query("UPDATE bank_account SET balance = balance - ? WHERE account_number = ?", [ammount, senderAccount], function(error) {
                                        if(error){
                                            return console.error(error.message)
                                        }
                                        connection.query("UPDATE bank_account SET balance = balance + ? WHERE account_number = ?", [ammount, receiverAccount], function(error) {
                                            if(error){
                                                return console.error(error.message)
                                            }
                                        })
                                    })  
                                })
                                    res.redirect('/accountInfo')
            
                                }else{
                                    res.send("The account you are trying to send to does not exist");
                                }
                            })

                        }
            
                        }else{
                            res.send("Cannot send from an account that you do not own")
                        }
                    })
                })
            }
        }else{
            res.send('Enter the accounts and the ammount to send')
        }
})

//Allows the account_owner to allow others to view one of their accounts
app.post('/addsigner', function (req,res){

    const signerID = req.body.ID
    const accountNumber = req.body.accountNumber

    if(req.session.loggedin){

        if(signerID == req.session.ID){
            res.redirect('/accountinfo')
        }
        connection.query("SELECT account_number FROM bank_account WHERE account_number= ? AND account_owner= ?", [accountNumber, req.session.ID],
            function(error, results){
                
                if(error){
                    return console.error(error.message)
                }
                if(results.length > 0){
                    connection.query("SELECT id FROM customer WHERE id=?",[signerID], function(error, results){
                        if(error){
                            console.error(error.message)
                        }
                        if(results.length > 0){

                            connection.query("INSERT INTO signs(signer, account_number) VALUES(" +signerID +","+accountNumber+")", function (error){

                                if(error){
                                    return console.error(error.message)
                                }
                                res.redirect('/accountinfo')
                
                        })
                        }else{
                            res.send("That Customer ID does not exist")
                        }
                    })
                    
            }else{
                res.send("You do not own that account")
            }
        })    
    }
})

app.listen(3000, () => {console.log("Server is running on port 3000")})
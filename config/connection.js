// const mongoClient=require('mongodb').MongoClient

// const state=
// {
//     db:null
// }
// module.exports.connect=function(done)
// {
//     const url='mongodb://localhost:27017'
//     const dbname='shopping'

//     mongoClient.connect(url,(err,data)=>
//     {
//         if(err) return done(err)
//         state.db=data.db(dbname)
//         done()
//     })
// } 

// module.exports.get=function()
// { 
//     return state.db
// }

const { MongoClient } = require("mongodb");

const state = {
  db: null,
};

// mongodb connection string
// const url = "mongodb+srv://zaiba:YjNdYHR4hDTlRniN@y-tasks.mcoz60a.mongodb.net/?retryWrites=true&w=majority";
const url = "mongodb://127.0.0.1:27017";
// database name
const dbName = "shopping";

// create a new mongodb client object
const client = new MongoClient(url);

// function to establish mongodb connection
const connect = async (cb) => {
  try {
    // connecting to mongodb
    await client.connect();
    // setting up database name to the connected client
    const db = client.db(dbName);
    // setting up database name to the state
    state.db = db;
    // callback after connected
    return cb();
  } catch (err) {
    // callback when an error occurs
    return cb(err);
  }
};

// function to get the database instance
const get = () => state.db;

// exporting functions
module.exports = {
  connect,
  get,
};
import mongoose from  'mongoose';
import { DB_NAME } from './constants.js';
import dotenv from 'dotenv';

import connectDB from './db/index.js';


dotenv.config({
    path: './env'
})

connectDB()












/*

import express from 'express';
const app = express()

( async () =>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on('error' , (error) =>{
            console.log('error', error);
            throw error
        })

        app.listen(process.env.PORT, () =>{
            console.log(`server is running on ${process.env.PORT} `)
        })
    } catch (error) {
        console.error('error',error)
        
    }
})()

*/
// db.js

const { Pool } = require('pg');

const pool = new Pool({
    user: 'PDF',       
    password: '12345', 
    host: 'localhost',   
    database: 'PDF',        
    port: 5432, 
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
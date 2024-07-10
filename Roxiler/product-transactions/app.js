const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const ProductTransaction = require('./model');

const app = express();
const PORT = 3000;

app.use(express.json());
const cors = require('cors');
app.use(cors());


// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/productTransactions', { useNewUrlParser: true, useUnifiedTopology: true });

// Initialize the database with seed data
app.get('/initialize', async (req, res) => {
  try {
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    const transactions = response.data;

    await ProductTransaction.deleteMany({});
    await ProductTransaction.insertMany(transactions);

    res.status(200).send('Database initialized with seed data');
  } catch (error) {
    res.status(500).send('Error initializing database: ' + error.message);
  }
});

// List all transactions with search and pagination
app.get('/transactions', async (req, res) => {
  try {
    const { page = 1, perPage = 10, search = '' } = req.query;
    const query = {
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { price: { $regex: search, $options: 'i' } }
      ]
    };

    const transactions = await ProductTransaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).send('Error fetching transactions: ' + error.message);
  }
});

// Get statistics for a specific month
app.get('/statistics', async (req, res) => {
  try {
    const { month } = req.query;
    const monthStart = new Date(`${month} 1, 2000`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const totalSaleAmount = await ProductTransaction.aggregate([
      { $match: { dateOfSale: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const totalSoldItems = await ProductTransaction.countDocuments({ dateOfSale: { $gte: monthStart, $lt: monthEnd }, sold: true });
    const totalNotSoldItems = await ProductTransaction.countDocuments({ dateOfSale: { $gte: monthStart, $lt: monthEnd }, sold: false });

    res.status(200).json({
      totalSaleAmount: totalSaleAmount[0]?.total || 0,
      totalSoldItems,
      totalNotSoldItems
    });
  } catch (error) {
    res.status(500).send('Error fetching statistics: ' + error.message);
  }
});

// Get bar chart data for a specific month
app.get('/bar-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthStart = new Date(`${month} 1, 2000`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const priceRanges = [
      { range: '0-100', min: 0, max: 100 },
      { range: '101-200', min: 101, max: 200 },
      { range: '201-300', min: 201, max: 300 },
      { range: '301-400', min: 301, max: 400 },
      { range: '401-500', min: 401, max: 500 },
      { range: '501-600', min: 501, max: 600 },
      { range: '601-700', min: 601, max: 700 },
      { range: '701-800', min: 701, max: 800 },
      { range: '801-900', min: 801, max: 900 },
      { range: '901-above', min: 901, max: Infinity }
    ];

    const barChartData = await Promise.all(priceRanges.map(async range => {
      const count = await ProductTransaction.countDocuments({
        dateOfSale: { $gte: monthStart, $lt: monthEnd },
        price: { $gte: range.min, $lt: range.max }
      });
      return { range: range.range, count };
    }));

    res.status(200).json(barChartData);
  } catch (error) {
    res.status(500).send('Error fetching bar chart data: ' + error.message);
  }
});

// Get pie chart data for a specific month
app.get('/pie-chart', async (req, res) => {
  try {
    const { month } = req.query;
    const monthStart = new Date(`${month} 1, 2000`);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);

    const pieChartData = await ProductTransaction.aggregate([
      { $match: { dateOfSale: { $gte: monthStart, $lt: monthEnd } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $project: { _id: 0, category: '$_id', count: 1 } }
    ]);

    res.status(200).json(pieChartData);
  } catch (error) {
    res.status(500).send('Error fetching pie chart data: ' + error.message);
  }
});

// Get combined data from all APIs
app.get('/combined-data', async (req, res) => {
  try {
    const { month } = req.query;
    
    const [transactions, statistics, barChart, pieChart] = await Promise.all([
      axios.get(`http://localhost:${PORT}/transactions?month=${month}`),
      axios.get(`http://localhost:${PORT}/statistics?month=${month}`),
      axios.get(`http://localhost:${PORT}/bar-chart?month=${month}`),
      axios.get(`http://localhost:${PORT}/pie-chart?month=${month}`)
    ]);

    res.status(200).json({
      transactions: transactions.data,
      statistics: statistics.data,
      barChart: barChart.data,
      pieChart: pieChart.data
    });
  } catch (error) {
    res.status(500).send('Error fetching combined data: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

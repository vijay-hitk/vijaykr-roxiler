// src/components/BarChart.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {Chart,  LinearScale  , CategoryScale , BarController , BarElement} from 'chart.js';

const BarChart = ({ selectedMonth }) => {
  const [barChartData, setBarChartData] = useState({ labels: [], datasets: [] });
  Chart.register(CategoryScale);
  Chart.register(LinearScale,BarController, BarElement);

  useEffect(() => {
    fetchBarChartData();
  }, [selectedMonth]);

  const fetchBarChartData = async () => {
    try {
      const response = await axios.get('http://localhost:3000/bar-chart', {
        params: { month: selectedMonth }
      });
      const labels = response.data.map((data) => data.range);
      const data = response.data.map((data) => data.count);
      setBarChartData({
        labels,
        datasets: [
          {
            label: 'Number of Items',
            data,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }
        ]
      });
    } catch (error) {
      console.error('Error fetching bar chart data:', error);
    }
  };

  return <Bar data={barChartData} />;
};

export default BarChart;

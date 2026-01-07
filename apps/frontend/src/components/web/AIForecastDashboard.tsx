'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DataTable, Column } from '../ui/DataTable';
import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

const demandForecastData = [
  { month: 'Jan', actual: 400, forecast: 420 },
  { month: 'Feb', actual: 300, forecast: 310 },
  { month: 'Mar', actual: 500, forecast: 480 },
  { month: 'Apr', actual: 278, forecast: 290 },
  { month: 'May', actual: 450, forecast: 460 },
  { month: 'Jun', actual: 380, forecast: 390 },
  { month: 'Jul', forecast: 410 },
  { month: 'Aug', forecast: 430 },
];

const productPerformanceData = [
  { name: 'Product A', fastMoving: 450, slowMoving: 50 },
  { name: 'Product B', fastMoving: 380, slowMoving: 80 },
  { name: 'Product C', fastMoving: 320, slowMoving: 120 },
  { name: 'Product D', fastMoving: 250, slowMoving: 180 },
  { name: 'Product E', fastMoving: 200, slowMoving: 220 },
];

const forecastData = [
  { productName: 'Product A', forecastType: 'Demand Increase', predictedValue: '+25%', recommendation: 'Increase stock by 30%' },
  { productName: 'Product B', forecastType: 'Seasonal Peak', predictedValue: 'Next 2 months', recommendation: 'Prepare 500 units' },
  { productName: 'Product C', forecastType: 'Declining Sales', predictedValue: '-15%', recommendation: 'Reduce orders by 20%' },
  { productName: 'Product D', forecastType: 'Stable Demand', predictedValue: '±5%', recommendation: 'Maintain current levels' },
  { productName: 'Product E', forecastType: 'Stock Optimization', predictedValue: 'Overstock', recommendation: 'Reduce inventory by 10%' },
];

export function AIForecastDashboard() {
  const columns: Column[] = [
    { header: 'Product Name', accessor: 'productName' },
    { 
      header: 'Forecast Type', 
      accessor: 'forecastType',
      render: (value) => (
        <div className="flex items-center gap-2">
          {value.includes('Increase') || value.includes('Peak') ? (
            <TrendingUp className="w-4 h-4 text-green-600" />
          ) : value.includes('Declining') ? (
            <TrendingDown className="w-4 h-4 text-red-600" />
          ) : null}
          <span>{value}</span>
        </div>
      ),
    },
    { header: 'Predicted Value', accessor: 'predictedValue' },
    { 
      header: 'Recommendation', 
      accessor: 'recommendation',
      render: (value) => (
        <span className="text-blue-600">{value}</span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">AI Forecast Dashboard</h2>
        <p className="text-gray-600">Predictive insights powered by AI</p>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 mb-2">AI-Generated Insights</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Product A shows strong growth trend - consider increasing inventory by 30% for next month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Seasonal demand peak expected for Product B in the next 2 months</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Product C experiencing declining sales - recommend promotional campaign or reduced ordering</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Product E is currently overstocked - optimize inventory to reduce holding costs</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Forecast Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Demand Forecast - Product A</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={demandForecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" name="Actual" strokeWidth={2} />
              <Line type="monotone" dataKey="forecast" stroke="#10b981" name="Forecast" strokeWidth={2} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Product Performance Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Fast-Moving vs Slow-Moving Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="fastMoving" fill="#10b981" name="Fast-Moving" />
              <Bar dataKey="slowMoving" fill="#ef4444" name="Slow-Moving" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-4">AI Forecast Recommendations</h3>
        <DataTable columns={columns} data={forecastData} />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600 mb-1">Forecast Accuracy</p>
          <p className="text-green-600 mb-1">94.5%</p>
          <p className="text-gray-500">Last 6 months average</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600 mb-1">Stock Optimization</p>
          <p className="text-blue-600 mb-1">$12,450</p>
          <p className="text-gray-500">Cost savings this month</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <p className="text-gray-600 mb-1">Demand Trends</p>
          <p className="text-purple-600 mb-1">15 Active</p>
          <p className="text-gray-500">Products being monitored</p>
        </div>
      </div>
    </div>
  );
}
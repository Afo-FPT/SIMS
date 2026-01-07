'use client';

import { DashboardCard } from '../ui/DashboardCard';
import { Package, Archive, AlertTriangle, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const inventoryData = [
  { month: 'Jan', stockIn: 400, stockOut: 240 },
  { month: 'Feb', stockIn: 300, stockOut: 139 },
  { month: 'Mar', stockIn: 500, stockOut: 380 },
  { month: 'Apr', stockIn: 278, stockOut: 390 },
  { month: 'May', stockIn: 450, stockOut: 300 },
  { month: 'Jun', stockIn: 380, stockOut: 280 },
];

const productData = [
  { name: 'Product A', quantity: 450 },
  { name: 'Product B', quantity: 380 },
  { name: 'Product C', quantity: 320 },
  { name: 'Product D', quantity: 250 },
  { name: 'Product E', quantity: 200 },
];

const recentActivity = [
  { action: 'Stock In', product: 'Product A - Batch #12345', time: '2 minutes ago', type: 'in' },
  { action: 'Stock Out', product: 'Product B - Batch #12344', time: '15 minutes ago', type: 'out' },
  { action: 'Low Stock Alert', product: 'Product C', time: '1 hour ago', type: 'alert' },
  { action: 'Stock In', product: 'Product D - Batch #12343', time: '2 hours ago', type: 'in' },
  { action: 'Cycle Count', product: 'Batch #12342', time: '3 hours ago', type: 'count' },
];

export function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">Dashboard Overview</h2>
        <p className="text-gray-600">Welcome to SIMS-AI Inventory Management</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Products"
          value="1,247"
          icon={Package}
          iconColor="bg-blue-100 text-blue-600"
          trend="+12% from last month"
        />
        <DashboardCard
          title="Total Batches"
          value="3,842"
          icon={Archive}
          iconColor="bg-green-100 text-green-600"
          trend="+8% from last month"
        />
        <DashboardCard
          title="Low Stock Items"
          value="23"
          icon={AlertTriangle}
          iconColor="bg-orange-100 text-orange-600"
          trend="Needs attention"
        />
        <DashboardCard
          title="Near Expiry"
          value="15"
          icon={Clock}
          iconColor="bg-yellow-100 text-yellow-600"
          trend="Next 30 days"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inventory Movement Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Inventory Movement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={inventoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="stockIn" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Stock In" />
              <Area type="monotone" dataKey="stockOut" stackId="2" stroke="#ef4444" fill="#ef4444" name="Stock Out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fast-Moving Products Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Fast-Moving Products</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#10b981" name="Quantity Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'in' ? 'bg-blue-500' :
                  activity.type === 'out' ? 'bg-red-500' :
                  activity.type === 'alert' ? 'bg-orange-500' :
                  'bg-green-500'
                }`} />
                <div className="flex-1">
                  <p className="text-gray-900">{activity.action}</p>
                  <p className="text-gray-600">{activity.product}</p>
                </div>
                <p className="text-gray-500">{activity.time}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Active Alerts</h3>
          <div className="space-y-3">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-gray-900">Low Stock Warning</p>
                  <p className="text-gray-600">Product C has only 15 units remaining</p>
                  <p className="text-gray-500 mt-1">30 minutes ago</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-gray-900">Near Expiry Alert</p>
                  <p className="text-gray-600">Batch #12340 expires in 5 days</p>
                  <p className="text-gray-500 mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-gray-900">Expired Batch</p>
                  <p className="text-gray-600">Batch #12335 has expired</p>
                  <p className="text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
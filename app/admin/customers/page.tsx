'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, MapPin } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  city: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch (error) {
      console.error('[Customers] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600 mt-2">Manage and analyze customer data</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search customers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading customers...</div>
      ) : filteredCustomers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map((customer) => (
            <Card key={customer._id} className="p-6 border-0 shadow-md hover:shadow-lg transition">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{customer.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                    {customer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {customer.phone}
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {customer.city}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {customer.totalOrders}
                      </p>
                      <p className="text-xs text-gray-600">Orders</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        Rs. {(customer.totalSpent || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Total Spent</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {customer.lastOrderDate
                          ? new Date(customer.lastOrderDate).toLocaleDateString('en-PK')
                          : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">Last Order</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 border-0 shadow-md text-center">
          <p className="text-gray-600">No customers found</p>
        </Card>
      )}
    </div>
  );
}

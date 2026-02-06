'use client';

import { Navbar } from '@/components/store/Navbar';
import { Footer } from '@/components/store/Footer';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Mail, Phone, MapPin } from 'lucide-react';

function AccountContent() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">Please login to view your account</p>
        <Button asChild className="bg-green-700">
          <a href="/login">Login</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <Card className="p-8 border-0 shadow-md">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-gray-600">{user.phone || 'No phone number set'}</p>
          </div>
        </div>
      </Card>

      {/* Profile Information */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Full Name
            </label>
            <Input value={user.name} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email
            </label>
            <Input value={user.email} disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-2" />
              Phone
            </label>
            <Input value={user.phone || ''} placeholder="No phone number" disabled />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Role
            </label>
            <Input value={user.role} disabled />
          </div>
        </div>

        <div className="mt-6">
          <Button variant="outline">Edit Profile</Button>
        </div>
      </Card>

      {/* Addresses */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Saved Addresses</h2>

        <div className="text-center py-8 text-gray-500">
          <p>No saved addresses yet.</p>
          <Button variant="outline" className="mt-4 bg-transparent">
            Add Address
          </Button>
        </div>
      </Card>

      {/* Quick Links */}
      <Card className="p-6 border-0 shadow-md">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Links</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button asChild variant="outline" className="h-auto py-4 bg-transparent">
            <a href="/orders">View Orders</a>
          </Button>
          <Button asChild variant="outline" className="h-auto py-4 bg-transparent">
            <a href="/products">Continue Shopping</a>
          </Button>
          <Button variant="outline" className="h-auto py-4 bg-transparent">
            Contact Support
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountContent />
      </main>
      <Footer />
    </div>
  );
}

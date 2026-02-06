'use client';

import React from "react"

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface Settings {
  storeName: string;
  contactEmail: string;
  contactPhone: string;
  ntn: string;
  strn: string;
  bankAccountNumber: string;
  easyPaisaNumber: string;
  jazzCashNumber: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    storeName: 'Khas Pure Food',
    contactEmail: '',
    contactPhone: '',
    ntn: '',
    strn: '',
    bankAccountNumber: '',
    easyPaisaNumber: '',
    jazzCashNumber: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Store Settings</h1>
        <p className="text-gray-600">Manage store information and payment details</p>
      </div>

      {/* Store Information */}
      <Card className="p-6 border-0 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Store Information</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Store Name
          </label>
          <Input
            name="storeName"
            value={settings.storeName}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Email
            </label>
            <Input
              name="contactEmail"
              value={settings.contactEmail}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Phone
            </label>
            <Input
              name="contactPhone"
              value={settings.contactPhone}
              onChange={handleChange}
            />
          </div>
        </div>
      </Card>

      {/* Tax Information */}
      <Card className="p-6 border-0 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Tax Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              NTN
            </label>
            <Input
              name="ntn"
              value={settings.ntn}
              onChange={handleChange}
              placeholder="National Tax Number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              STRN
            </label>
            <Input
              name="strn"
              value={settings.strn}
              onChange={handleChange}
              placeholder="Sales Tax Registration Number"
            />
          </div>
        </div>
      </Card>

      {/* Payment Information */}
      <Card className="p-6 border-0 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Payment Methods</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Account Number
          </label>
          <Input
            name="bankAccountNumber"
            value={settings.bankAccountNumber}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              EasyPaisa Number
            </label>
            <Input
              name="easyPaisaNumber"
              value={settings.easyPaisaNumber}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JazzCash Number
            </label>
            <Input
              name="jazzCashNumber"
              value={settings.jazzCashNumber}
              onChange={handleChange}
            />
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="bg-green-700 hover:bg-green-800"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}

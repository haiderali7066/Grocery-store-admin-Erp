'use client';

import React from "react"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Settings } from 'lucide-react';

interface FBRConfig {
  _id?: string;
  businessName: string;
  ntn: string;
  strn: string;
  posDeviceId: string;
  posDeviceSerialNumber: string;
  fbrApiUrl: string;
  fbrApiKey: string;
  isEnabled: boolean;
  lastSyncTime?: string;
}

export default function FBRSettingsPage() {
  const [config, setConfig] = useState<FBRConfig>({
    businessName: 'Khas Pure Food',
    ntn: '',
    strn: '',
    posDeviceId: '',
    posDeviceSerialNumber: '',
    fbrApiUrl: '',
    fbrApiKey: '',
    isEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/fbr-config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          setVerified(data.isEnabled && data.ntn && data.strn);
        }
        setLoading(false);
      } catch (error) {
        console.error('[FBR Settings] Error fetching config:', error);
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = () => {
    setConfig((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const saveConfig = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/fbr-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Save failed');

      const result = await res.json();
      setMessage('Configuration saved successfully!');
      setConfig(result);
      setVerified(result.isEnabled && result.ntn && result.strn);
    } catch (error) {
      console.error('[FBR Settings] Error saving:', error);
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setSaving(true);
    setMessage('');
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/fbr-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error('Test failed');

      const result = await res.json();
      setTestResult(result);
      setMessage('Test completed');
    } catch (error) {
      console.error('[FBR Settings] Error testing:', error);
      setMessage('Connection test failed');
    } finally {
      setSaving(false);
    }
  };

  const syncWithFBR = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/fbr-config/sync', {
        method: 'POST',
      });

      if (!res.ok) throw new Error('Sync failed');

      const result = await res.json();
      setMessage(result.message || 'Synced with FBR successfully');
    } catch (error) {
      console.error('[FBR Settings] Error syncing:', error);
      setMessage('Sync failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading FBR configuration...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings size={32} />
            FBR Integration Configuration
          </h1>
          <p className="text-gray-600 mt-2">Manage your POS FBR integration settings</p>
        </div>

        {/* Status Card */}
        <Card
          className={`p-6 mb-6 border-l-4 ${
            verified ? 'border-l-green-500 bg-green-50' : 'border-l-yellow-500 bg-yellow-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {verified ? (
              <>
                <CheckCircle className="text-green-600 mt-1" size={24} />
                <div>
                  <p className="font-bold text-green-900">FBR Configuration Active</p>
                  <p className="text-green-700 text-sm mt-1">
                    Your POS system is integrated with FBR and ready to process invoices.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="text-yellow-600 mt-1" size={24} />
                <div>
                  <p className="font-bold text-yellow-900">Incomplete Configuration</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please fill in all required fields to enable FBR integration.
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Configuration Form */}
        <Card className="p-6 space-y-6 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Business Name</label>
            <Input
              name="businessName"
              value={config.businessName}
              onChange={handleInputChange}
              placeholder="Enter business name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                NTN (National Tax Number) *
              </label>
              <Input
                name="ntn"
                value={config.ntn}
                onChange={handleInputChange}
                placeholder="e.g., 1234567890"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                STRN (Sales Tax Registration Number) *
              </label>
              <Input
                name="strn"
                value={config.strn}
                onChange={handleInputChange}
                placeholder="e.g., 1234567890123"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                POS Device ID *
              </label>
              <Input
                name="posDeviceId"
                value={config.posDeviceId}
                onChange={handleInputChange}
                placeholder="Enter POS device ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-900">
                POS Device Serial Number *
              </label>
              <Input
                name="posDeviceSerialNumber"
                value={config.posDeviceSerialNumber}
                onChange={handleInputChange}
                placeholder="Enter serial number"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">FBR API URL</label>
            <Input
              name="fbrApiUrl"
              value={config.fbrApiUrl}
              onChange={handleInputChange}
              placeholder="https://api.fbr.gov.pk/..."
              type="url"
            />
            <p className="text-xs text-gray-600 mt-1">
              Leave blank to use default FBR endpoint
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">FBR API Key</label>
            <Input
              name="fbrApiKey"
              value={config.fbrApiKey}
              onChange={handleInputChange}
              placeholder="Enter your FBR API key"
              type="password"
            />
            <p className="text-xs text-gray-600 mt-1">
              Keep this secure. Never share with unauthorized parties.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded">
            <input
              type="checkbox"
              id="enabled"
              checked={config.isEnabled}
              onChange={handleToggle}
              className="w-4 h-4"
            />
            <label htmlFor="enabled" className="text-sm font-semibold text-gray-900">
              Enable FBR Integration
            </label>
          </div>

          {config.lastSyncTime && (
            <div className="p-3 bg-gray-100 rounded text-sm text-gray-600">
              Last sync: {new Date(config.lastSyncTime).toLocaleString()}
            </div>
          )}
        </Card>

        {/* Status Message */}
        {message && (
          <div
            className={`p-4 rounded mb-6 ${
              message.includes('successfully')
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message}
          </div>
        )}

        {/* Test Results */}
        {testResult && (
          <Card className="p-6 mb-6 bg-blue-50 border border-blue-200">
            <h3 className="font-bold mb-4 text-blue-900">Connection Test Results</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Status:</span>
                <span
                  className={`font-bold ${
                    testResult.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {testResult.status}
                </span>
              </div>
              {testResult.message && (
                <div>
                  <span>Message:</span>
                  <p className="text-gray-700 mt-1">{testResult.message}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Configuration
          </Button>
          <Button
            onClick={testConnection}
            disabled={saving}
            variant="outline"
            className="flex-1 bg-transparent"
          >
            Test Connection
          </Button>
          <Button
            onClick={syncWithFBR}
            disabled={saving || !verified}
            variant="outline"
            className="flex-1 bg-transparent"
          >
            Sync Now
          </Button>
        </div>

        {/* Documentation */}
        <Card className="p-6 mt-6 bg-gray-100">
          <h3 className="font-bold mb-3 text-gray-900">Setup Instructions</h3>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>Obtain your NTN and STRN from FBR</li>
            <li>Register your POS device with FBR</li>
            <li>Get your POS Device ID and Serial Number</li>
            <li>Obtain FBR API credentials (URL and API Key)</li>
            <li>Enter all details above and test the connection</li>
            <li>Enable FBR integration and start processing invoices</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}

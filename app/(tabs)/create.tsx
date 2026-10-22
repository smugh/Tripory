import React from 'react';
import { Redirect } from 'expo-router';

export default function CreateTripTabPlaceholder() {
  return <Redirect href="/trip/new" />;
}

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import InvoiceScreen from './src/InvoiceScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <InvoiceScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB' },
});

